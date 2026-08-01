# QR Code Generator with AWS Amplify

A full-stack QR code generator built with Next.js 14, AWS Amplify Gen2, and TypeScript. You generate a QR code, it gets stored in S3, and every scan is tracked and counted.

I built this as the demo for an AWS User Group Cebu talk, so the code leans toward showing how the Amplify Gen2 pieces fit together rather than being the smallest possible implementation.

## What it does

QR codes are generated client-side and uploaded to S3, so the image persists and can be shared. Each code redirects through a tracking route that records the scan (timestamp, user agent, referrer) before forwarding the visitor to the target URL. A dashboard lists your codes with their scan counts and lets you delete them.

Users sign in through Amazon Cognito, and authorization rules mean you only ever see your own codes.

## Architecture

The frontend is Next.js 14 on the App Router, with TypeScript and Tailwind. QR logic lives in custom hooks rather than in components, which keeps the pages thin.

The backend is Amplify Gen2: Cognito for auth, AppSync for the GraphQL API, DynamoDB for storage, S3 for the images, and a Lambda function for the S3 upload.

### Data models

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

## Running it

You'll need Node.js 18+ and an AWS account. Having the AWS CLI configured makes the deploy step easier but isn't strictly required.

```bash
git clone https://github.com/Cyvid7-Darus10/aws-cebu-demo.git
cd aws-cebu-demo
npm install
```

Copy the environment template and fill it in:

```bash
cp env.example .env.local
```

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="QR Code Generator"
NEXT_PUBLIC_APP_DESCRIPTION="Generate and track QR codes with AWS Amplify"
```

Deploy the backend into a sandbox, then start the dev server:

```bash
npm install -g @aws-amplify/cli
npx ampx sandbox
```

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Project structure

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

## The hooks

`useQrGeneration` creates the record, generates the image, and uploads it:

```typescript
const { generateQr, isGenerating, qrResult, error } = useQrGeneration();

await generateQr({
  targetUrl: "https://example.com",
  label: "My QR Code",
});
```

`useQrTracking` records a scan and hands back the destination to redirect to:

```typescript
const { trackAndRedirect, isTracking } = useQrTracking();

const targetUrl = await trackAndRedirect({
  qrId: "01234567890",
  userAgent: navigator.userAgent,
  referer: document.referrer,
});
```

`useQrManagement` covers listing and deleting:

```typescript
const { qrItems, loading, deleteQr } = useQrManagement();

// List user's QR codes
useEffect(() => {
  fetchQrItems();
}, []);

// Delete a QR code
await deleteQr("qr-id");
```

On the backend, `qrGenerateFn` builds the QR image from the tracking URL, uploads it to S3 with caching headers, and returns the S3 key along with the tracking URL.

## Configuration

Client-side variables:

```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME="Your App Name"
NEXT_PUBLIC_APP_DESCRIPTION="Your app description"
NEXT_PUBLIC_TWITTER_HANDLE=@yourhandle
```

The Lambda needs `BASE_URL` set to the same domain, since that's what the tracking URLs are built from.

Everything is read through `lib/config.ts` rather than scattered `process.env` calls:

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

To rebrand it, change `lib/config.ts` and swap the PWA icons, Apple touch icon, and Open Graph image in `/public/`.

## Deploying

Set `NEXT_PUBLIC_BASE_URL` and `BASE_URL` to your production domain in whatever platform you're deploying from, then:

```bash
npx ampx pipeline-deploy --branch main --app-id <your-app-id>
npm run build
npm start
```

If you'd rather use Amplify Hosting, `amplify add hosting` followed by `amplify publish` will do it.

## Security

Authentication runs through Cognito User Pools with automatic JWT handling. The GraphQL schema uses owner-based authorization, so a user's queries only ever return their own QR codes. The API accepts both API key and user pool auth depending on the operation, since the public scan route has to work for visitors who aren't signed in. S3 images are served through signed URLs.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## Troubleshooting

If you hit an Amplify configuration error, check that `Amplify.configure()` runs before `generateClient()`. This is the most common one.

S3 upload failures are almost always Lambda permissions or a missing `AMPLIFY_STORAGE_BUCKET_NAME`.

GraphQL authorization errors usually mean the auth state hasn't resolved yet, or the authorization rule on the model doesn't match what the query is asking for.

For more detail on any of these:

```bash
NEXT_PUBLIC_DEBUG=true npm run dev
```

## Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS Lambda Functions](https://docs.aws.amazon.com/lambda/)

## License

MIT-0. See [LICENSE](./LICENSE).

Built by [Cyrus Pastelero](https://github.com/Cyvid7-Darus10).
