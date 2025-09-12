# Architecture Overview

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Frontend] --> B[React Components]
        B --> C[Custom Hooks]
        C --> D[TypeScript Types]
    end

    subgraph "AWS Amplify Gen2"
        E[Amplify Client] --> F[Authentication]
        E --> G[GraphQL API]
        E --> H[Storage]
        F --> I[Amazon Cognito]
        G --> J[AWS AppSync]
        H --> K[Amazon S3]
    end

    subgraph "Backend Services"
        J --> L[DynamoDB]
        J --> M[Lambda Functions]
        M --> N[QR Generation]
        M --> K
    end

    subgraph "Infrastructure"
        O[AWS CDK] --> P[CloudFormation]
        P --> Q[AWS Resources]
    end

    A --> E

    style A fill:#2196F3
    style E fill:#FF9800
    style L fill:#4CAF50
    style K fill:#9C27B0
```

## Data Flow Architecture

### User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Amplify
    participant C as Cognito
    participant G as GraphQL API
    participant D as DynamoDB
    participant L as Lambda
    participant S as S3

    U->>F: Access Application
    F->>A: Initialize Amplify
    F->>C: Check Auth Status

    alt User Not Authenticated
        F->>C: Show Login Form
        U->>C: Login Credentials
        C->>F: JWT Token
    end

    U->>F: Generate QR Code
    F->>L: Call Lambda Function
    L->>S: Upload QR Image
    L->>F: Return S3 Key
    F->>G: Create QR Record
    G->>D: Store QR Metadata
    D->>G: Confirm Creation
    G->>F: Return QR Data
    F->>U: Display QR Code
```

## Component Architecture

### Frontend Components Structure

```
├── app/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignUpForm.tsx
│   │   ├── qr/
│   │   │   ├── QRGenerator.tsx
│   │   │   ├── QRList.tsx
│   │   │   └── QRCard.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       └── Footer.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useQRCodes.ts
│   │   └── useStorage.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   └── types/
│       ├── auth.ts
│       ├── qr.ts
│       └── common.ts
```

### Backend Services Structure

```
├── amplify/
│   ├── auth/
│   │   └── resource.ts
│   ├── data/
│   │   └── resource.ts
│   ├── storage/
│   │   └── resource.ts
│   ├── functions/
│   │   ├── qrGenerateFn/
│   │   │   ├── handler.ts
│   │   │   └── resource.ts
│   │   └── qrTrackFn/
│   │       ├── handler.ts
│   │       └── resource.ts
│   └── backend.ts
```

## Infrastructure as Code

### AWS CDK Stack Overview

```mermaid
graph TB
    subgraph "Infrastructure Stack"
        A[Amplify App] --> B[Hosting]
        A --> C[Backend Resources]

        C --> D[Cognito User Pool]
        C --> E[AppSync GraphQL API]
        C --> F[DynamoDB Tables]
        C --> G[Lambda Functions]
        C --> H[S3 Bucket]

        I[CI/CD Pipeline] --> J[Build & Deploy]
        J --> K[Environment Management]
    end

    style A fill:#FF9800
    style C fill:#4CAF50
    style I fill:#2196F3
```

### Resource Dependencies

```mermaid
graph LR
    A[Amplify Backend] --> B[Authentication]
    A --> C[Data Layer]
    A --> D[Storage Layer]
    A --> E[Functions]

    B --> F[Cognito User Pool]
    C --> G[AppSync API]
    G --> H[DynamoDB]
    D --> I[S3 Bucket]
    E --> J[Lambda Functions]

    J --> I
    J --> H
    G --> J
    F --> G

    style A fill:#FFD700
    style F fill:#FF9800
    style G fill:#4CAF50
    style H fill:#9C27B0
    style I fill:#2196F3
    style J fill:#F44336
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TB
    A[User Request] --> B{Authenticated?}
    B -->|No| C[Cognito Login]
    B -->|Yes| D[JWT Token Validation]
    C --> E[Issue JWT Token]
    E --> D
    D --> F{Authorized?}
    F -->|No| G[Access Denied]
    F -->|Yes| H[Resource Access]
    H --> I[DynamoDB/S3]

    style C fill:#FF9800
    style D fill:#4CAF50
    style G fill:#F44336
    style H fill:#2196F3
```

### Data Protection Layers

1. **Network Security**
   - HTTPS/TLS encryption in transit
   - VPC endpoints for private communication
   - CloudFront distribution with security headers

2. **Application Security**
   - JWT token-based authentication
   - Resource-level authorization rules
   - Input validation and sanitization

3. **Data Security**
   - Encryption at rest (DynamoDB, S3)
   - IAM roles and policies
   - Least privilege access principles

## Scalability Design

### Horizontal Scaling

```mermaid
graph TB
    subgraph "Auto-Scaling Components"
        A[Lambda Functions] --> A1[Concurrent Executions: 1000]
        B[DynamoDB] --> B1[On-Demand Scaling]
        C[S3] --> C1[Unlimited Storage]
        D[CloudFront] --> D1[Global Edge Locations]
        E[AppSync] --> E1[Auto-Scaling Resolvers]
    end

    style A fill:#FF9800
    style B fill:#4CAF50
    style C fill:#2196F3
    style D fill:#9C27B0
    style E fill:#F44336
```

### Performance Optimization

1. **Frontend Optimization**
   - Static site generation with Next.js
   - Image optimization and lazy loading
   - Code splitting and bundle optimization
   - CDN distribution via CloudFront

2. **Backend Optimization**
   - Lambda cold start minimization
   - DynamoDB query optimization
   - S3 object lifecycle management
   - AppSync response caching

## Monitoring & Observability

### Logging Architecture

```mermaid
graph LR
    A[Application Logs] --> B[CloudWatch Logs]
    C[Lambda Logs] --> B
    D[API Gateway Logs] --> B
    E[DynamoDB Metrics] --> F[CloudWatch Metrics]
    G[S3 Access Logs] --> B

    B --> H[Log Insights]
    F --> I[CloudWatch Dashboards]
    H --> J[Alerts & Notifications]
    I --> J

    style B fill:#FF9800
    style F fill:#4CAF50
    style J fill:#F44336
```

### Key Metrics to Monitor

1. **Application Metrics**
   - User authentication success rate
   - QR code generation latency
   - File upload success rate
   - API response times

2. **Infrastructure Metrics**
   - Lambda invocation count and duration
   - DynamoDB read/write capacity usage
   - S3 request count and error rate
   - CloudFront cache hit ratio

3. **Business Metrics**
   - Daily active users
   - QR codes created per user
   - Feature adoption rates
   - User retention metrics

## Disaster Recovery

### Backup Strategy

```mermaid
graph TB
    A[Production Data] --> B[Automated Backups]
    B --> C[DynamoDB Point-in-Time Recovery]
    B --> D[S3 Cross-Region Replication]
    B --> E[Code Repository Backups]

    F[Recovery Procedures] --> G[Data Restoration]
    F --> H[Infrastructure Recreation]
    F --> I[Application Deployment]

    style A fill:#2196F3
    style B fill:#4CAF50
    style F fill:#FF9800
```

### Multi-Region Considerations

1. **Current Single Region Setup**
   - All resources in primary region (us-east-1)
   - Cost-optimized for MVP stage
   - Manual failover procedures documented

2. **Future Multi-Region Options**
   - DynamoDB Global Tables for data replication
   - S3 Cross-Region Replication for assets
   - CloudFront global distribution
   - Route 53 health checks for automatic failover
