# Junkyard Management System - Deployment Guide

This guide will help you deploy your Junkyard Management System from a local development environment to a live production environment.

## Prerequisites

Before deploying, you'll need:

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Deployment Platform** - Choose one:
   - Vercel (Recommended)
   - Netlify
   - Firebase Hosting
   - AWS S3 + CloudFront

## Step 1: Set Up Supabase Database

### 1.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Set project name: `junkyard-management`
5. Set database password (save this!)
6. Choose region closest to your location
7. Click "Create new project"

### 1.2 Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql` from your project
3. Paste it into the SQL editor and click "Run"
4. Verify tables were created in the Table Editor

### 1.3 Configure Authentication

1. Go to Authentication > Settings
2. Set Site URL to your production domain (e.g., `https://yourdomain.com`)
3. Add your domain to "Additional Redirect URLs"
4. Enable Email authentication
5. Configure email templates (optional)

### 1.4 Get Your Supabase Credentials

1. Go to Settings > API
2. Copy your Project URL
3. Copy your anon/public key
4. Save these for environment variables

## Step 2: Prepare Your Application

### 2.1 Create Environment Variables

Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=your-project-url-here
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Update Configuration

The app is already configured to use Supabase. Make sure all mock authentication has been replaced with real Supabase authentication.

### 2.3 Test Locally

```bash
npm install
npm start
```

Test the authentication system:
1. Try creating a new account
2. Verify email confirmation works
3. Test login/logout
4. Test user roles (admin/driver)

## Step 3: Deploy to Production

### Option A: Deploy to Vercel (Recommended)

Vercel offers the best experience for React apps with automatic deployments.

#### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 3.2 Deploy
```bash
# Build the project
npm run build

# Deploy to Vercel
vercel

# Follow the prompts:
# ? Set up and deploy? Y
# ? Which scope? (your account)
# ? Link to existing project? N
# ? What's your project's name? junkyard-management
# ? In which directory is your code located? ./
```

#### 3.3 Configure Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key

#### 3.4 Redeploy
```bash
vercel --prod
```

### Option B: Deploy to Netlify

#### 3.1 Build Your Project
```bash
npm run build
```

#### 3.2 Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Drag and drop your `build` folder onto the Netlify dashboard
3. Or connect your GitHub repository for automatic deployments

#### 3.3 Configure Environment Variables

1. Go to Site Settings > Environment Variables
2. Add your Supabase credentials

### Option C: Deploy to Firebase Hosting

#### 3.1 Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### 3.2 Initialize Firebase
```bash
firebase init hosting
```

#### 3.3 Build and Deploy
```bash
npm run build
firebase deploy
```

## Step 4: Post-Deployment Setup

### 4.1 Update Supabase URLs

1. Go back to your Supabase dashboard
2. Update Authentication settings with your production URL
3. Update CORS settings if needed

### 4.2 Create Admin User

Since you can't create admin users through the UI, you'll need to:

1. Sign up for a regular account through your app
2. Go to Supabase > Table Editor > user_profiles
3. Find your user and change `role` from `driver` to `admin`

### 4.3 Test Everything

Test all major features:
- [ ] User registration and login
- [ ] Password reset
- [ ] Vehicle purchase recording
- [ ] Vehicle sale recording
- [ ] Cash tracking
- [ ] Expense reporting
- [ ] NMVTIS reporting
- [ ] User management (admin only)
- [ ] Settings configuration

## Step 5: Domain and SSL (Optional)

### 5.1 Custom Domain

Most hosting platforms allow you to add a custom domain:

**Vercel:**
1. Go to your project settings
2. Add your domain under "Domains"
3. Configure your DNS records

**Netlify:**
1. Go to Domain Management
2. Add custom domain
3. Configure DNS

### 5.2 SSL Certificate

SSL certificates are automatically provided by:
- Vercel
- Netlify
- Firebase Hosting

## Step 6: Monitoring and Maintenance

### 6.1 Set Up Monitoring

Consider adding:
- Google Analytics for usage tracking
- Sentry for error monitoring
- Uptime monitoring (UptimeRobot, Pingdom)

### 6.2 Regular Backups

Supabase provides automatic backups, but you should also:
1. Export data regularly using the backup features in your app
2. Keep copies of your database schema
3. Document any custom configurations

### 6.3 Updates and Maintenance

1. Keep dependencies updated
2. Monitor Supabase for updates
3. Test new features in a staging environment first

## Security Considerations

### 6.1 Environment Variables
- Never commit `.env` files to version control
- Use platform-specific environment variable settings
- Rotate keys regularly

### 6.2 Database Security
- Supabase RLS (Row Level Security) is already configured
- Review and update policies as needed
- Monitor access logs

### 6.3 Application Security
- Keep dependencies updated
- Use HTTPS everywhere
- Implement proper input validation

## Troubleshooting

### Common Issues

**Authentication not working:**
- Check environment variables are set correctly
- Verify Supabase URL and redirect URLs
- Check browser console for errors

**Database connection issues:**
- Verify Supabase credentials
- Check RLS policies
- Ensure user has proper permissions

**Build failures:**
- Check for TypeScript errors
- Verify all dependencies are installed
- Check for missing environment variables

### Getting Help

1. Check browser developer console for errors
2. Review Supabase dashboard for auth/database issues
3. Check hosting platform logs
4. Review this deployment guide

## Success! 🎉

Your Junkyard Management System should now be live and accessible to users. Users can:

1. **Sign up** for new accounts with email verification
2. **Log in** with their credentials
3. **Reset passwords** if forgotten
4. **Record vehicle purchases and sales** with proper data persistence
5. **Track cash and expenses** with real-time updates
6. **Generate NMVTIS reports** for compliance
7. **Manage users** (admin functionality)

The system now uses real authentication and database storage instead of mock data, making it production-ready for actual junkyard operations. 