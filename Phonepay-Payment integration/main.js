const express = require('express');
const axios = require('axios');
const sha256 = require("sha256");
const uniqid = require("uniqid");
const app = express()
const path = require("path");
const { buffer } = require('stream/consumers');
const bodyParser = require('body-parser');
const { error } = require('console');
const port = process.env.PORT || 3000;

const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const Merchant_ID = "PGTESTPAYUAT";

const Key_Index = 1;
const Salt_Key = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
let Random_merchantTransactionId;

app.get('/', (req, res) => {
     // res.send('Phonepay_payment_integration system !')
     res.sendFile(path.join(__dirname, "index.html"));
})


app.get("/pay", (req, res) => {
     const pay_Endpoint = "/pg/v1/pay";
      Random_merchantTransactionId = uniqid();
     const payload = {
          "merchantId": Merchant_ID,
          "merchantTransactionId": Random_merchantTransactionId,
          "merchantUserId": "MUID123",
          "amount": 80000, //in paise
          "redirectUrl": `http://localhost:3000/${Merchant_ID}`,
          "redirectMode": "REDIRECT",
          "mobileNumber": "9999999999",
          "paymentInstrument": {
               "type": "PAY_PAGE"
          }
     };
     const jsonPayload = JSON.stringify(payload);
     const base64EncodedPayload = Buffer.from(jsonPayload).toString("base64");

     //    SHA256(base64 encoded payload + “/pg/v1/pay” + salt key) + ### + salt index
     const x_VERIFY = sha256(base64EncodedPayload + pay_Endpoint + Salt_Key) + "###" + Key_Index;

     const options = {
          method: 'post',
          url: `${PHONE_PE_HOST_URL}${pay_Endpoint}`,
          headers: {
               'Content-Type': 'application/json',
               "X-VERIFY": x_VERIFY
          },
          data: {
               "request": base64EncodedPayload
          }
     };

     axios.request(options)
          .then(function (response) {
               console.log(response.data);
               if (response.status === 200) {
                    const redirectURL = response.data.data.instrumentResponse.redirectInfo.url;
                    res.redirect(redirectURL);

               } else {
                    res.status(response.status).send(response.statusText);
               }
          })
          .catch(function (error) {
               console.error(error);
               res.status(500).send("Internal Server Error");
          });
});

app.get("/:Merchant_ID", (req, res) => {
     const { Merchant_ID } = req.params;
     const merchantTransactionId=Random_merchantTransactionId;
     //SHA256(“/pg/v1/status/{merchantId}/{merchantTransactionId}” + saltKey) + “###” + saltIndex
     const x_VERIFY=sha256(`/pg/v1/status/${Merchant_ID}/${merchantTransactionId}` + Salt_Key) + "###" + Key_Index;
     if (Merchant_ID) {

     const options = {
           method: 'get',
           url: `https://${PHONE_PE_HOST_URL}/pg/v1/status/${Merchant_ID}/${merchantTransactionId}`,
           headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    "X-MERCHANT-ID": Merchant_ID,
                    "X-VERIFY": x_VERIFY
               },

          };
          axios
               .request(options)
               .then(function (response) {
                    console.log(response.data);
                    res.send(response.data)
               })
               .catch(function (error) {
                    console.error(error);
               });

          // res.send(merchantTransactionId);
     }
     else {
          res.send({ "error": error });
     }

})

app.listen(port, () => console.log(`app listening on port ${port}!`))