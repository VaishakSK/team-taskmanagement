# Email Configuration Troubleshooting Guide

## Common OTP Email Issues in Production

### 1. Environment Variables Missing
Make sure these are set in your Render backend service:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### 2. Gmail App Password Required
- Enable 2-factor authentication on your Gmail account
- Generate an App Password: https://myaccount.google.com/apppasswords
- Use the App Password (not your regular password)

### 3. Asynchronous Email Sending Issue
Your current code sends emails asynchronously without error handling:

```javascript
// CURRENT (PROBLEMATIC)
sendOTP(email, otp).catch(err => {
  console.error('Error sending OTP email (non-blocking):', err);
});
```

This means the API responds immediately even if email fails.

## Solutions

### Option 1: Make Email Synchronous (Recommended for debugging)
```javascript
try {
  await sendOTP(email, otp);
  res.json({ message: 'OTP sent to your email' });
} catch (emailError) {
  console.error('Failed to send OTP:', emailError);
  return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
}
```

### Option 2: Better Async Error Handling
```javascript
sendOTP(email, otp)
  .then(() => {
    console.log('OTP sent successfully to:', email);
  })
  .catch(err => {
    console.error('OTP sending failed:', err);
    // Optionally: implement retry logic or fallback notification
  });
```

### 4. Test Email Configuration
Add this endpoint to test email sending:

```javascript
// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    const testOtp = '123456';
    await sendOTP(email, testOtp);
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: 'Email configuration error', details: error.message });
  }
});
```

### 5. Common Email Service Issues
- **Gmail**: Requires App Password, not regular password
- **Outlook**: May require different SMTP settings
- **Corporate Email**: May block external SMTP

### 6. Render-Specific Issues
- Render free tier may have email sending restrictions
- Check Render logs for email errors
- Ensure environment variables are correctly set

## Quick Fix Steps

1. **Check Render Environment Variables**
   - Go to your backend service on Render
   - Verify all EMAIL_* variables are set

2. **Test Email Configuration**
   - Add the test endpoint above
   - Try sending a test email

3. **Check Render Logs**
   - Look for email-related errors in service logs

4. **Update Email Sending Logic**
   - Make email sending synchronous for better error handling
   - Add proper error responses

## Alternative Email Services

If Gmail doesn't work in production, consider:
- SendGrid (free tier available)
- Mailgun (free tier available)
- AWS SES (paid, but reliable)
- Resend (modern, developer-friendly)
