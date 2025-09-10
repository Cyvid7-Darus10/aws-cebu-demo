# QR Code Generator with AWS Amplify

A modern, full-stack QR code generator built with Next.js 14, AWS Amplify Gen2, and TypeScript. Generate, track, and manage QR codes with real-time analytics and cloud storage.

## ✨ Features

### 🚀 Core Functionality

- **QR Code Generation**: Create QR codes instantly with client-side generation
- **Cloud Storage**: Automatic S3 upload for persistent QR code images
- **Real-time Tracking**: Track scans with detailed analytics (user agent, referrer, timestamps)
- **QR Management**: View, organize, and delete your QR codes from a dashboard
- **Responsive Design**: Mobile-first UI with Tailwind CSS

### 🔧 Technical Features

- **Authentication**: Secure user authentication with Amazon Cognito
- **GraphQL API**: Type-safe API with AWS AppSync
- **Real-time Database**: Amazon DynamoDB with Amplify Data client
- **Serverless Functions**: AWS Lambda for S3 operations
- **PWA Ready**: Progressive Web App capabilities with manifest and service worker support
- **SEO Optimized**: Complete metadata, Open Graph, and structured data

## 🏗️ Architecture

### Frontend (Next.js 14)

- **App Router**: Modern Next.js with server and client components
- **React Hooks**: Custom hooks for QR generation, tracking, and management
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with responsive design

### Backend (AWS Amplify Gen2)

- **Authentication**: Amazon Cognito User Pools
- **API**: AWS AppSync GraphQL API
- **Database**: Amazon DynamoDB with real-time capabilities
- **Storage**: Amazon S3 for QR code images
- **Functions**: AWS Lambda for server-side operations

### Data Models

```graphql
# QR Items - Store QR code metadata
QrItems {
  id: ID!
  targetUrl: String!
  s3Key: String!
  ownerSub: String
  createdAt: AWSDateTime!
  lastScanAt: AWSDateTime
  scanCount: Int
}

# QR Scans - Track individual scans
QrScans {
  qrId: String!
  scanAt: AWSDateTime!
  ua: String
  referer: String
  ip: String
  country: String
}
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured (optional but recommended)

### 1. Clone and Install

```bash
git clone <repository-url>
cd aws-cebu-demo
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your values
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="QR Code Generator"
NEXT_PUBLIC_APP_DESCRIPTION="Generate and track QR codes with AWS Amplify"
```

### 3. Deploy Backend

```bash
# Install Amplify CLI if needed
npm install -g @aws-amplify/cli

# Deploy to AWS
npx ampx sandbox
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 📁 Project Structure

```
aws-cebu-demo/
├── app/                          # Next.js App Router
│   ├── components/              # React components
│   │   ├── atoms/              # Basic UI components
│   │   ├── molecules/          # Composite components
│   │   └── organisms/          # Complex components
│   ├── hooks/                  # Custom React hooks
│   │   ├── useQrGeneration.ts  # QR generation logic
│   │   ├── useQrTracking.ts    # QR scan tracking
│   │   ├── useQrManagement.ts  # QR CRUD operations
│   │   └── useQrImage.ts       # S3 image fetching
│   ├── dashboard/              # Dashboard page
│   ├── login/                  # Authentication page
│   └── qr/[id]/               # QR tracking route
├── amplify/                    # AWS Amplify configuration
│   ├── auth/                  # Cognito configuration
│   ├── data/                  # GraphQL schema & resolvers
│   ├── functions/             # Lambda functions
│   └── storage/               # S3 configuration
├── lib/                       # Utility functions
│   ├── config.ts             # Environment configuration
│   └── utils.ts              # Helper functions
└── public/                   # Static assets
    ├── icons/               # PWA icons
    └── manifest files       # PWA & SEO assets
```

## 🎯 Key Components

### Custom Hooks

#### `useQrGeneration`

Handles QR code creation with database operations and S3 upload:

```typescript
const { generateQr, isGenerating, qrResult, error } = useQrGeneration();

await generateQr({
  targetUrl: "https://example.com",
  label: "My QR Code",
});
```

#### `useQrTracking`

Manages QR scan tracking and redirection:

```typescript
const { trackAndRedirect, isTracking } = useQrTracking();

const targetUrl = await trackAndRedirect({
  qrId: "01234567890",
  userAgent: navigator.userAgent,
  referer: document.referrer,
});
```

#### `useQrManagement`

Provides QR code CRUD operations:

```typescript
const { qrItems, loading, deleteQr } = useQrManagement();

// List user's QR codes
useEffect(() => {
  fetchQrItems();
}, []);

// Delete a QR code
await deleteQr("qr-id");
```

### Lambda Functions

#### `qrGenerateFn`

Handles S3 upload for QR code images:

- Generates QR code image from tracking URL
- Uploads to S3 with optimized caching headers
- Returns S3 key and tracking URL

## 🔧 Configuration

### Environment Variables

#### Client-side (NEXT*PUBLIC*\*)

```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME="Your App Name"
NEXT_PUBLIC_APP_DESCRIPTION="Your app description"
NEXT_PUBLIC_TWITTER_HANDLE=@yourhandle
```

#### Server-side (Lambda)

```bash
BASE_URL=https://your-domain.com  # Used for QR tracking URLs
```

### Amplify Configuration

The `lib/config.ts` file centralizes all configuration:

```typescript
export const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "QR Code Generator",
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "...",
  },
  // ... more config
};
```

## 🚀 Deployment

### Production Deployment

1. **Set Environment Variables**

   ```bash
   # In your deployment platform (Amplify Console, Vercel, etc.)
   NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
   BASE_URL=https://your-production-domain.com
   ```

2. **Deploy Backend**

   ```bash
   npx ampx pipeline-deploy --branch main --app-id <your-app-id>
   ```

3. **Build and Deploy Frontend**
   ```bash
   npm run build
   npm start
   ```

### Amplify Hosting

For seamless deployment with Amplify Hosting:

```bash
# Connect your repository
amplify add hosting

# Deploy
amplify publish
```

## 🛡️ Security

### Authentication

- **Cognito User Pools**: Secure user authentication
- **JWT Tokens**: Automatic token management
- **Authorization Rules**: GraphQL field-level security

### Data Protection

- **Owner-based Access**: Users can only access their QR codes
- **API Key + User Pool**: Dual authentication modes
- **S3 Security**: Signed URLs for secure image access

## 📊 Analytics & Monitoring

### Built-in Analytics

- **Scan Tracking**: Timestamp, user agent, referrer
- **Usage Statistics**: Scan counts per QR code
- **User Metrics**: QR codes per user

### Optional Integrations

Add to `lib/config.ts`:

```typescript
analytics: {
  googleAnalyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  hotjarId: process.env.NEXT_PUBLIC_HOTJAR_ID,
}
```

## 🎨 Customization

### Styling

- **Tailwind CSS**: Utility-first styling
- **Component Library**: Atomic design system
- **Responsive**: Mobile-first approach

### Branding

Update `lib/config.ts` and replace assets in `/public/`:

- `icon-192x192.png` - PWA icon
- `icon-512x512.png` - PWA icon
- `apple-touch-icon.png` - iOS icon
- `og-image.png` - Social sharing image

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Quality

- **ESLint**: Code linting with Next.js rules
- **TypeScript**: Full type safety
- **Prettier**: Code formatting (can be added)

## 🐛 Troubleshooting

### Common Issues

1. **Amplify Configuration Error**

   ```
   Solution: Ensure Amplify.configure() is called before generateClient()
   ```

2. **S3 Upload Failures**

   ```
   Solution: Check Lambda permissions and AMPLIFY_STORAGE_BUCKET_NAME
   ```

3. **GraphQL Authorization Errors**
   ```
   Solution: Verify authentication state and authorization rules
   ```

### Debug Mode

Enable detailed logging:

```bash
NEXT_PUBLIC_DEBUG=true npm run dev
```

## 📚 Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Next.js Documentation](https://nextjs.org/docs)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [AWS Lambda Functions](https://docs.aws.amazon.com/lambda/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **AWS Support**: AWS Support for infrastructure issues

---

Built with ❤️ using AWS Amplify, Next.js, and TypeScript
