"use strict";
const mongoose = require("mongoose");
const IssueModel = require("../models").Issue;
const ProjectModel = require("../models").Project;
const ObjectId = mongoose.Types.ObjectId;

module.exports = function (app) {
  app
    .route("/api/issues/:project")
    .get(async (req, res) => {
      const projectName = req.params.project;
      const {
        _id,
        open,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
      } = req.query;

      try {
        const matchConditions = [
          { $match: { name: projectName } },
          { $unwind: "$issues" },
        ];

        if (_id)
          matchConditions.push({ $match: { "issues._id": new ObjectId(_id) } });
        if (open)
          matchConditions.push({ $match: { "issues.open": open === "true" } });
        if (issue_title)
          matchConditions.push({
            $match: { "issues.issue_title": issue_title },
          });
        if (issue_text)
          matchConditions.push({ $match: { "issues.issue_text": issue_text } });
        if (created_by)
          matchConditions.push({ $match: { "issues.created_by": created_by } });
        if (assigned_to)
          matchConditions.push({
            $match: { "issues.assigned_to": assigned_to },
          });
        if (status_text)
          matchConditions.push({
            $match: { "issues.status_text": status_text },
          });

        const data = await ProjectModel.aggregate(matchConditions);

        if (!data || data.length === 0) {
          res.json([]);
        } else {
          const mappedData = data.map((item) => item.issues);
          res.json(mappedData);
        }
      } catch (err) {
        console.error("Error in GET request:", err);
        res.status(500).json({ error: "Server error" });
      }
    })

    .post(async (req, res) => {
      const project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } =
        req.body;

      if (!issue_title || !issue_text || !created_by) {
        res.json({ error: "required field(s) missing" });
        return;
      }

      const newIssue = new IssueModel({
        issue_title: issue_title || "",
        issue_text: issue_text || "",
        created_on: new Date(),
        updated_on: new Date(),
        created_by: created_by || "",
        assigned_to: assigned_to || "",
        open: true,
        status_text: status_text || "",
      });

      try {
        let projectData = await ProjectModel.findOne({ name: project });

        if (!projectData) {
          const newProject = new ProjectModel({ name: project });
          newProject.issues.push(newIssue);
          await newProject.save();
          res.json(newIssue);
        } else {
          projectData.issues.push(newIssue);
          await projectData.save();
          res.json(newIssue);
        }
      } catch (err) {
        console.error("Error in POST request:", err);
        res.status(500).send("There was an error saving in post");
      }
    })

    .put(async (req, res) => {
      const project = req.params.project;
      const {
        _id,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        open,
      } = req.body;

      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }

      if (
        !issue_title &&
        !issue_text &&
        !created_by &&
        !assigned_to &&
        !status_text &&
        open === undefined
      ) {
        res.json({ error: "no update field(s) sent", _id: _id });
        return;
      }

      try {
        let projectData = await ProjectModel.findOne({ name: project });

        if (!projectData) {
          res.json({ error: "could not update", _id: _id });
        } else {
          const issueData = projectData.issues.id(_id);
          if (!issueData) {
            res.json({ error: "could not update", _id: _id });
            return;
          }
          issueData.issue_title = issue_title || issueData.issue_title;
          issueData.issue_text = issue_text || issueData.issue_text;
          issueData.created_by = created_by || issueData.created_by;
          issueData.assigned_to = assigned_to || issueData.assigned_to;
          issueData.status_text = status_text || issueData.status_text;
          issueData.updated_on = new Date();
          if (open !== undefined) issueData.open = open;

          await projectData.save();
          res.json({ result: "successfully updated", _id: _id });
        }
      } catch (err) {
        console.error("Error in PUT request:", err);
        res.json({ error: "could not update", _id: _id });
      }
    })

    .delete(async (req, res) => {
      const project = req.params.project;
      const { _id } = req.body;

      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }

      try {
        let projectData = await ProjectModel.findOne({ name: project });

        if (!projectData) {
          res.json({ error: "could not delete", _id: _id });
        } else {
          const issueData = projectData.issues.id(_id);
          if (!issueData) {
            res.json({ error: "could not delete", _id: _id });
            return;
          }
          issueData.deleteOne();
          await projectData.save();
          res.json({ result: "successfully deleted", _id: _id });
        }
      } catch (err) {
        console.error("Error in DELETE request:", err);
        res.json({ error: "could not delete", _id: _id });
      }
    });
};
