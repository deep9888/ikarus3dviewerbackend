const express = require('express');
const app = express();
require('dotenv').config();
const AWS = require('aws-sdk');
const cors = require('cors');
const PORT = 3031;

app.use(cors());
app.use(express.json());

AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.accessKeyId,
    secretAccessKey: process.env.secretAccessKey,
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
    const password
        = req.body.password;
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    // get dbEmail and dbPassword from aws

    // compare above data with db's email and pswrd
    if(email === dbEmail && password === dbPassword){
        res.json({
            msg: 'loggedin successfully'
        })
    }
})

app.get('/files/:v', async (req, res)=>{
    const v = req.params.v;
console.log('v: ', v);
    const params = {
        KeyConditionExpression: "id = :s",
        ExpressionAttributeValues: {
            ":s": v
        },
        ProjectionExpression: "id, #URL, annotation",
        ExpressionAttributeNames: { "#URL": "URL" },
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

app.post('/signup', async (req, res) => {
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
        if (err) console.log('e==========', err)
        else console.log('d============', data)
    });
    res.send('Signed Up Successfully');
})
app.listen(PORT, () => {
    console.log('Server Running ', PORT);
})