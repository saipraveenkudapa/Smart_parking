# Vercel Environment Variables Setup

## ⚠️ IMPORTANT: Your deployment is failing because environment variables are missing!

### Quick Fix Steps

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select your `Smart_Parking` project
   - Navigate to: Settings → Environment Variables

2. **Add ALL these environment variables:**

   Copy the values from your local `.env` file:

   ```
   Variable Name: DATABASE_URL
   Value: [Your Supabase Pooling Connection URL]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: DIRECT_URL
   Value: [Your Supabase Direct Connection URL]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: JWT_SECRET
   Value: [Your JWT Secret - generate with: openssl rand -base64 32]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: JWT_EXPIRES_IN
   Value: 7d
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: TWILIO_ACCOUNT_SID
   Value: [Your Twilio Account SID]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: TWILIO_AUTH_TOKEN
   Value: [Your Twilio Auth Token]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: TWILIO_PHONE_NUMBER
   Value: [Your Twilio Phone Number with + prefix]
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: NEXT_PUBLIC_APP_URL
   Value: https://your-app-name.vercel.app
   Environment: Production, Preview, Development
   ```

   ```
   Variable Name: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   Value: [Your Google Maps API Key]
   Environment: Production, Preview, Development
   ```

3. **After adding all variables:**
   - Go to the **Deployments** tab
   - Click on your latest deployment
   - Click the **"Redeploy"** button
   - Wait for the deployment to complete

4. **Test your signup:**
   - Visit your Vercel URL
   - Try to sign up
   - Should work now! ✅

## 🔍 How to Get Your Values

### DATABASE_URL & DIRECT_URL
From your local `.env` file - these are your Supabase connection strings

### JWT_SECRET
Generate a new one for production:
```bash
openssl rand -base64 32
```
Or copy from your local `.env` file

### Twilio Credentials
From your Twilio dashboard: https://console.twilio.com/

### Google Maps API Key
From Google Cloud Console: https://console.cloud.google.com/

## 🚨 Common Mistakes to Avoid

1. ❌ Don't forget the `NEXT_PUBLIC_` prefix for client-side variables
2. ❌ Don't add quotes around values in Vercel (it adds them automatically)
3. ❌ Make sure to select all three environments (Production, Preview, Development)
4. ❌ Don't forget to **Redeploy** after adding variables

## ✅ Verification

After redeployment, check:
1. Signup page loads without errors
2. Can create a new user account
3. Authentication works
4. Database records are created

## 💡 Pro Tip

To avoid this in future deployments:
- Keep your `.env.example` file updated
- Document all required environment variables
- Use Vercel CLI for automated deployment: `vercel --prod`
