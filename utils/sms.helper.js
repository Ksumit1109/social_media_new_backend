const axios = require("axios");
const dotenv = require('dotenv');
dotenv.config();

const { FAST_TO_SMS_API_KEY } = process.env;

const checkWalletBalance = async () => {
  try {
    const response = await axios.get(`https://www.fast2sms.com/dev/wallet?authorization=${FAST_TO_SMS_API_KEY}`, {
      timeout: 5000, // Set timeout in milliseconds
    });

    const apiData = response.data;
    return { status: true, msg: 'Wallet Balance Fetched', balance: apiData && apiData.wallet ? apiData.wallet : 0 };
  } catch (e) {
    return { status: false, msg: e.message, balance: 0 };
  }
};

const sendOTPSMS = async ({ otp, numbers, countrycode }) => {
  const walletBalance = await checkWalletBalance();
  if (walletBalance.balance < 0) return { status: false, msg: 'Low Wallet Balance', data: null };

  const smsData = {
    variables_values: otp,
    route: 'otp',
    numbers
  };
  console.log("FAST_TO_SMS_API_KEY", FAST_TO_SMS_API_KEY)
  try {
    const resopnse = await axios.post('https://www.fast2sms.com/dev/bulkV2', smsData, {
      headers: {
        Authorization: FAST_TO_SMS_API_KEY
      },
      timeout: 5000, // Set timeout in milliseconds
    })
    console.log("resopnse", resopnse)
  } catch (error) {
    console.log("error", error)
  }
  // .then((response) => {
  //   console.log("sms sent successfully", response.data);
  // })
  // .catch((error) => {
  //   console.log("error sending sms", error);
  // });
};

module.exports = { sendOTPSMS, checkWalletBalance };
