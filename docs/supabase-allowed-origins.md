# Configuring Allowed Origins in Supabase

To resolve CORS issues and allow your application to communicate with Supabase, you need to configure the allowed origins in the Supabase dashboard.

## Steps to Add Allowed Origins

1. **Log in to Supabase**:
   - Visit [Supabase Dashboard](https://app.supabase.io/).
   - Log in with your account credentials.

2. **Select Your Project**:
   - From the list of projects, select the project associated with your application.

3. **Navigate to API Settings**:
   - In the left-hand menu, click on **Settings**.
   - Under **Settings**, select **API**.

4. **Add Allowed Origins**:
   - Scroll down to the **Allowed Origins (CORS)** section.
   - Add the following URLs (replace with your development and production URLs):
     - `http://localhost:8080`
     - `http://127.0.0.1:8080`
     - Your production URL (e.g., `https://yourdomain.com`).

5. **Save Changes**:
   - Click the **Save** button to apply the changes.

6. **Test the Configuration**:
   - Restart your development server.
   - Verify that the fetch requests to Supabase no longer result in CORS errors.

## Notes
- Ensure that the Supabase anon key used in your application matches the one in the dashboard.
- For production, restrict the allowed origins to your domain to enhance security.

By following these steps, you should be able to resolve CORS issues and enable seamless communication between your application and Supabase.