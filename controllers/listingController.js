const express = require("express")
const Listing = require("../models/listing")
const asyncHandler = require("express-async-handler")
const listings = express.Router()
const { body, param, validationResult } = require("express-validator")
const fileUpload = require("express-fileupload")
const multer = require("multer")
const aws = require("aws-sdk")

// temporary store uploaded file in buffer
const storage = multer.memoryStorage()

// check file type uploaded, must be JPEG
const filefilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
    cb(null, true)
  } else {
    cb(null, false)
  }
}
// configuration for upload variables
const upload = multer({ storage: storage, fileFilter: filefilter })

// create S3 instance
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
  region: process.env.AWS_S3_BUCKET_REGION,
})

listings.post("/upload", upload.single("image"), (req, res) => {
  console.log(req.file)

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME, // bucket that we made earlier
    Key: Date.now() + req.file.originalname, // Name of the image
    Body: req.file.buffer, // Body which will contain the image in buffer format
    ACL: "public-read-write", // defining the permissions to get the public link
    ContentType: "image/jpeg", // Necessary to define the image content-type to view the photo in the browser with the link
  }

  // uploading photo and save link in database
  s3.upload(params, (error, data) => {
    if (error) {
      res.status(500).send({ err: error + "This is " }) // if we get any error while uploading error message will be returned.
    }
    console.log(data)
  })

  return res.status(200).send({ msg: "uploaded successfully" })
})

// listings.post("/upload", async (req, res) => {
//   AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
//     region: process.env.AWS_S3_BUCKET_REGION,
//   })

//   const s3 = new AWS.S3()

//   const fileContent = Buffer.from(req.file.data, "binary")

//   const params = {
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: req.files.data.name,
//     Body: fileContent,
//   }

//   s3.upload(params, (err, data) => {
//     if (err) {
//       throw err
//     }
//     res.send({
//       response_code: 200,
//       response_message: "Success",
//       response_data: data,
//     })
//   })
// })

listings.post(
  "/create",
  upload.single("image"),
  body("rental").isNumeric(),
  asyncHandler(async (req, res) => {
    // return validation errors, if any
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    console.log(req.file)

    // parameters for s3 instance
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME, // S3 bucket name
      Key: Date.now() + req.file.originalname, // timestamp + filename
      Body: req.file.buffer, // image
      ACL: "public-read-write", // permissions
      ContentType: "image/jpeg", // define content-type
    }

    // uploading photo and save link in database
    s3.upload(params, async (error, data) => {
      if (error) {
        res.status(500).send({ err: error }) // if we get any error while uploading error message will be returned.
      } else {
        newListing.image = data.Location
        console.log("File uploaded to:" + data.Location)
        try {
          const createdListing = await Listing.create(newListing)
          res.status(200).send(createdListing)
        } catch (error) {
          res.status(400).json({ error: error.message })
        }
      }
    })
  })
)

listings.get("/all", async (req, res) => {
  try {
    const allListings = await Listing.find().exec()
    if (!allListings?.length) {
      res.status(400).json({ msg: "No listings found" })
    }
    // console.log(Listing)
    res.status(200).json(allListings)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
  // res.send("Testing")
})

//UPDATE
listings.put(
  "/edit/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const { newListingsInput } = req.body

    try {
      const updatedListings = await Listing.findByIdAndUpdate(
        id,
        {
          newListingsInput,
        },
        {
          new: true,
        }
      ).exec()
      if (updatedListings) {
        res.status(200).json(updatedListings)
      } else return res.status(404).json({ message: "Listing not found" })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })
)

module.exports = listings
