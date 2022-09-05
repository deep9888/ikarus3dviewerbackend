const express = require('express');
const app = express();
require('dotenv').config();
const AWS = require('aws-sdk');
const formidable = require('formidable');
const cors = require('cors');


const multer = require('multer');
const storage = multer.memoryStorage() ;
let upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        //if (mimeTypes.includes(file.mimetype)) {
          return cb(null, true);
        //}
        //cb('File type not allowed', false);
    }
}).any();



const PORT = 3031;
const {
    v4: uuidv4
} = require('uuid');
app.use(cors());
app.use(express.json());

AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
});

const s3 = new AWS.S3({
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
    region: process.env.REGION
});

const docClient = new AWS.DynamoDB.DocumentClient();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    console.log(email)
    const params = {
        Key: {
            "email": email
        },
        TableName: "signUpUsers"
    }
    docClient.get(params, function (err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            if (Object.keys(data).length === 0) {
                console.log("Empty")
            } else {
                dbEmail = data.Item.email;
                dbPassword = data.Item.password;
                if (email === dbEmail && password === dbPassword) {
                    console.log("matching");
                    res.json({
                        msg: 'loggedin successfully',
                        email,
                        password
                    })
                } else {
                    console.log("Not matching");
                    res.json({
                        msg: 'Email & Password not matching'
                    })
                }
            }
            // console.log(data);
        }
    });
    // console.log(params);
    // docClient.query(params, function (err, fetchedData) {
    //     var dbEmail, dbPassword;
    //     if (err) {
    //         console.log("not matched");
    //         //console.log("Error", err);
    //     } else {
    //         dbEmail = fetchedData.Items[0].email;
    //         dbPassword = fetchedData.Items[0].password;
    //     }
    //     // compare above data with db's email and pswrd
    //     console.log(email)
    //     console.log(dbEmail)
    //     if (email === dbEmail && password === dbPassword) {
    //         console.log("matching");
    //         res.json({
    //             msg: 'loggedin successfully'
    //         })
    //     }else{
    //         console.log("Not matching");
    //         res.json({
    //             msg: 'Email & Password not matching'
    //         })
    //     }
    // })
})

app.get('/files/:v', async (req, res) => {
    const v = req.params.v;
    console.log('v: ', v);
    const params = {
        KeyConditionExpression: "id = :s",
        ExpressionAttributeValues: {
            ":s": v
        },
        ProjectionExpression: "id, #URL, annotation",
        ExpressionAttributeNames: {
            "#URL": "URL"
        },
        TableName: "testing"
    }
    console.log(params);
    let data;
    docClient.query(params, function (err, fetchedData) {
        if (err) {
            console.log("Error", err);
        } else {
            data = fetchedData
        }
    })
    console.log(data);
    res.json(data)
})

app.post('/signup', express.json(), (req, res) => {
    const fname = req.body.firstName;
    const lname = req.body.lastName;
    const emailSignUp = req.body.emailSignup;
    const passwordSignUp = req.body.passwordSignUp;
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const signUpUserDetails = {
        TableName: 'signUpUsers',
        Item: {
            email: emailSignUp,
            password: passwordSignUp,
            fname: fname,
            lname: lname,
            Date: date,
            time: time
        },
    };
    docClient.put(signUpUserDetails, function (err, data) {
        if (err && err.code === "ConditionalCheckFailedException") {
            console.log("Wrong Email or password")
            return res.status(401).json({
                msg: "Not account with this email."
            });
        } else if (err) res.json({
            msg: "Insert Failed with some other reason"
        });
        else res.json({
            msg: "Sucessfully inserted"
        });
    });
})
app.post('/saveDB', express.json(), (req, res) => {
    console.log('click');
    const id = uuidv4();
    const annotation = req.body.annotations;
    const url = req.body.URL;
    //uniqueID.push(id);

    var params3 = {
        TableName: 'testing',
        Item: {
            id: id,
            annotation: annotation,
            URL: url
        },
    };
    docClient.put(params3, function (err, data) {
        if (err) console.log('e==========', err)
        else console.log('d============', data)
    });
    res.send('Saved Successfully');
})
app.post('/saveGLB', (req, res) => {

    // const form = formidable({
    //     multiples: true
    // });
    // form.parse(req, (err, fields, files) => {
    //     // console.log('fields: ', fields);
    //     console.log(files['sendFile']);

    //     // const params = {
    //     //     Body: files.sendFile,
    //     //     Bucket: process.env.BUCKET_NAME,
    //     //     Key: fields.sendFileName
    //     // }
    //     // console.log(files.sendFile);
    //     // const uploadData = s3.upload(params).promise();
    //     // uploadData.then(function (result) {
    //     //     console.log('RESULT ========== ', result.Location);
    //     //     preSignedURL = result.Location;
    //     // })

    //     res.send({
    //         success: true
    //     });


    // });

    upload(req, res, (err) => {
        if (err) {
            // An error occurred when uploading to server memory
            return res.status(502).json(err) ;
        }
        console.log(req.body.sendFileName);
        console.log(req.files[0])

        
        
        const params = {
            Body: req.files[0],
            Bucket: process.env.BUCKET_NAME,
            Key: req.body.sendFileName
        }
        
        const uploadData = s3.upload(params).promise();
        uploadData.then(function (result) {
            console.log('RESULT ========== ', result.Location);
            preSignedURL = result.Location;
        })

            res.send({
            success: true
        });
    })
    
})


app.listen(PORT, () => {
    console.log('Server Running ', PORT);
})