const express = require("express")
const Enquiry = require("../models/enquiry")
const asyncHandler = require("express-async-handler")
const enquiry = express.Router()
const { body, param, validationResult } = require("express-validator")

enquiry.post(
  "/send",
  [body("mobile", "Mobile Number is required").isMobilePhone("en-SG")],
  asyncHandler(async (req, res) => {
    const { id, name, email, mobile, msg, status, remarks } = req.body
    const enquiryForm = await Enquiry.create({
      id,
      name,
      email,
      mobile,
      msg,
      status,
      remarks,
    })
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    if (enquiryForm) {
      return res.status(201).json(enquiryForm)
    } else {
      return res.status(400).json({ msg: "Enquiry Failed" })
    }
  })
)

enquiry.get(
  "/all",
  asyncHandler(async (req, res) => {
    const allEnquiries = await Enquiry.find().populate("id").exec()
    if (!allEnquiries?.length) {
      return res.status(400).json({ msg: "No Enquiry" })
    }
    return res.json(allEnquiries)
  })
)

enquiry.put(
  "/update/:id",
  param("id").isMongoId(),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const updates = req.body

    const updatedLeads = await Enquiry.findByIdAndUpdate(
      id,
      {
        $set: { status: updates.status },
      },
      {
        new: true,
      }
    )
    if (!updatedLeads) {
      return res.status(404).json({ msg: "Enquiry Not Found" })
    } else {
      return res.status(200).json(updatedLeads)
    }
  })
)

module.exports = enquiry
