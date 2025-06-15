# Junkyard Management System

A comprehensive web application for managing junkyard operations, including vehicle purchases, sales, inventory tracking, NMVTIS compliance, and financial management.

## Features

### 🚗 Vehicle Management

- **Purchase Tracking**: Record vehicle acquisitions with seller information, pricing, and documentation
- **Sales Management**: Track parts sales and whole vehicle sales with buyer details
- **VIN Scanning**: Built-in VIN scanner for quick data entry
- **Digital Signatures**: Capture signatures for transactions

### 💰 Financial Management

- **Cash Tracking**: Real-time cash balance tracking for drivers
- **Expense Reporting**: Detailed expense tracking with categories and receipts
- **Transaction History**: Complete audit trail of all financial activities
- **Accounting Dashboard**: Financial overview and reporting for administrators

### 📋 Compliance & Reporting

- **NMVTIS Integration**: Automated reporting to National Motor Vehicle Title Information System
- **State Compliance**: Tools for meeting state-specific junkyard regulations
- **Logbook Management**: Digital logbook for all vehicle transactions
- **Backup & Recovery**: Automated data backup with email delivery

### 👥 User Management

- **Role-Based Access**: Admin and Driver roles with appropriate permissions
- **User Profiles**: Detailed user information with licensing and contact details
- **Real Authentication**: Secure email-based user authentication with password reset

### 🔧 Additional Features

- **Impound/Lien Management**: Track impounded vehicles and lien processes
- **Offline Support**: Works offline with automatic sync when connected
- **Mobile Responsive**: Optimized for tablets and mobile devices
- **Dark/Light Theme**: User-configurable interface themes

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router v6
- **State Management**: React Hooks
- **Offline Storage**: Dexie (IndexedDB)
- **PWA Support**: Service Workers for offline functionality

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Supabase account (for production deployment)

### Local Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd junkyard-management-standalone
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development server**

   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### First Time Setup

1. **Create your first admin account** through the signup form
2. **Manually promote to admin** in your Supabase dashboard (user_profiles table)
3. **Configure yard settings** in the Settings panel
4. **Add additional users** through the User Management interface

## Deployment

This application is production-ready and can be deployed to various platforms. See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Recommended Deployment Stack

- **Frontend**: Vercel or Netlify
- **Database**: Supabase
- **Domain**: Custom domain with SSL

### Quick Deploy to Vercel

```bash
npm install -g vercel
npm run build
vercel
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

Run the SQL schema in your Supabase dashboard:

1. Copy contents of `supabase-schema.sql`
2. Paste into Supabase SQL Editor
3. Execute to create all required tables and policies

## User Roles

### Admin Users

- Full access to all features
- User management capabilities
- System settings configuration
- Financial oversight and reporting
- NMVTIS compliance management

### Driver Users

- Vehicle purchase and sale recording
- Personal cash tracking
- Expense reporting
- Basic vehicle lookup and history

## NMVTIS Compliance

The system supports automated NMVTIS reporting:

- **Automatic Report Generation**: Creates reports for qualifying transactions
- **Manual Submission**: Export reports for manual submission to state systems
- **Compliance Tracking**: Monitor reporting status and deadlines
- **State Integration**: Ready for integration with state reporting systems

## Security Features

- **Row-Level Security**: Database policies ensure users only access their data
- **Role-Based Access Control**: Different permissions for admin and driver roles
- **Secure Authentication**: Email verification and password reset
- **Data Encryption**: All data encrypted in transit and at rest
- **Audit Trail**: Complete logging of all user actions

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Support & Documentation

- **Deployment Guide**: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)
- **Database Schema**: [`supabase-schema.sql`](./supabase-schema.sql)
- **Environment Setup**: [`.env.example`](./.env.example)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### v2.0.0 - Production Ready

- ✅ Real Supabase authentication
- ✅ Database persistence
- ✅ User management system
- ✅ Production deployment ready
- ✅ Comprehensive documentation

### v1.0.0 - Initial Release

- Basic vehicle management
- Mock authentication
- Local storage only
- Development prototype
