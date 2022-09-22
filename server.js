const express = require('express');
const app = express();
require('dotenv').config();

const AWS = require('aws-sdk');

const cors = require('cors');

const upload = require("express-fileupload");
app.use(upload());

const _ = require('lodash');

const PORT = 3031;

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


let annotationStorage = {};

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

app.post('/files/:fileUUID', async (req, res) => {
    const fileUUID = req.params.fileUUID;
    const params = {
        KeyConditionExpression: "Id = :s",
        ExpressionAttributeValues: {
            ":s": fileUUID
        },
        ProjectionExpression: "Id, #URL, annotation",
        ExpressionAttributeNames: {
            "#URL": "URL"
        },
        TableName: "glb-annotations"
    }
    let data;
    docClient.query(params, function (err, fetchedData) {
        if (err) {
            console.log("Error", err);
        } else {
            data = fetchedData
            res.status(200).json({d:data});
        }
    })
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
app.put('/saveDB', express.json(), (req, res) => {
    const id = req.body.Id;
    const annotation = req.body.annotations;
    const textFieldId = req.body.textFieldId;
    const url = req.body.URL;
    const fileName = req.body.FileName;

    // using lodash module to push only unique value in array suppose user clicks twice on save button then it stores only one value if text are same
    if (_.find(annotationStorage, annotation) == null) {
        annotationStorage = {...annotationStorage, [`${textFieldId}`]: {annotation}}
    }
    
    const annotationStorageParams = {
        TableName: 'glb-annotations',
        Item: {
            Id: id,
            annotation: annotationStorage,
            URL: url,
            FileName: fileName
        },
    };
    
    docClient.put(annotationStorageParams, function (err, data) {
        if (err) console.log('e==========', err)
        else console.log('d============', data)
    });
    res.send('Saved Successfully');
})
app.post('/deleteDB', (req, res) => {
    const id = req.body.id;
    const textFieldIndex = req.body.textFieldIndex;
    console.log(textFieldIndex)
    const annotationDeleteParams = {     
        TableName : "glb-annotations",
        Key : {
            "Id": id
        },
        UpdateExpression : `REMOVE annotation.${String(textFieldIndex)}`,
        
        ReturnValues : "UPDATED_OLD"
    };

    docClient.update(annotationDeleteParams, function(err, data){
        if(err){
            console.log(err)
        }else{
            const returnDeleteKey = Object.keys(data.Attributes.annotation);
            delete annotationStorage[returnDeleteKey]
            res.status(200).json({data:data});
        }
    })
})
app.post('/saveModelsFiles', (req, res) => {
    const file = req.files;
    let preSignedURL;
    const uploadDataParams = {
        Body: file.sendFile.data,
        Bucket: process.env.BUCKET_NAME,
        Key: req.body.sendFileName
    }

    const uploadData = s3.upload(uploadDataParams).promise();
    uploadData.then(function (result) {
        preSignedURL = result.Location;
        res.status(200).json({url:preSignedURL})    
    })
})
app.post('/scanResult', async (req,res)=>{
    let scanFileName = [];
    let scanFileID = [];
    var tableScanParams = {
        TableName: 'glb-annotations',
        ProjectionExpression: 'Id, FileName'
    };
    let items;
    items = await docClient.scan(tableScanParams).promise();

    for (let i = 0; i < items.Items.length; i++) {
        scanFileName.push(items.Items[i].FileName);
        scanFileID.push(items.Items[i].Id);
    }
    res.status(200).json({Id:scanFileID,fileName:scanFileName}) 
})


app.listen(PORT, () => {
    console.log('Server Running ', PORT);
})