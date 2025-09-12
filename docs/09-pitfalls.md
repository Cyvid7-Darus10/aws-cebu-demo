# Common Pitfalls & How to Avoid Them

[← Back: Best Practices](08-best-practices.md) | [Next: Cost Control →](10-cost-control.md)

---

## The Top 5 MVP Killers

```mermaid
graph TB
    A[Common Pitfalls] --> B[Wrong Region Settings]
    A --> C[Forgetting Cleanup]
    A --> D[Public S3 Buckets]
    A --> E[Hardcoded Secrets]
    A --> F[Over-Provisioned Capacity]

    B --> G[💰 Higher Costs]
    C --> H[💸 Surprise Bills]
    D --> I[🔓 Security Breach]
    E --> J[🚨 Data Leak]
    F --> K[💳 Budget Exceeded]

    style A fill:#FFD700
    style G fill:#F44336
    style H fill:#F44336
    style I fill:#F44336
    style J fill:#F44336
    style K fill:#F44336
```

These mistakes can kill your MVP before it even launches. Here's how to avoid them.

---

## Pitfall #1: Wrong Region Settings

### The Problem

```bash
# Creating resources in expensive regions
aws configure set region us-west-1  # More expensive than us-east-1
aws s3 mb s3://my-bucket  # Now costs 20% more

# Or accidentally mixing regions
aws configure set region us-east-1
amplify init  # Creates in us-east-1
aws rds create-db-instance --region us-west-2  # Oops, cross-region costs!
```

**Why It Happens:**

- Not checking default region
- Following tutorials with different regions
- Team members in different locations

**The Cost Impact:**

- 15-30% higher compute costs
- Cross-region data transfer fees
- Latency issues for global users

### The Solution

**1. Choose Cost-Effective Regions**

```bash
# Best regions for cost optimization
aws configure set region us-east-1  # Usually cheapest, most services
# OR
aws configure set region us-west-2  # Good alternative

# Always verify your region
aws configure get region
echo "Current region: $(aws configure get region)"
```

**2. Region Selection Criteria**

```typescript
// Region selection framework
const regionChoice = {
  primary: "us-east-1", // Cheapest, most services
  secondary: "us-west-2", // Good backup
  avoid: [
    "us-west-1", // More expensive
    "ap-southeast-1", // High costs for most services
    "eu-west-1", // European pricing
  ],
};
```

**3. Lock in Your Region**

```bash
# Set region in multiple places
export AWS_DEFAULT_REGION=us-east-1
echo 'export AWS_DEFAULT_REGION=us-east-1' >> ~/.bashrc

# For Amplify projects
echo '{"region": "us-east-1"}' > .amplifyrc
```

---

## Pitfall #2: Forgetting Resource Cleanup

### The Problem

```typescript
// Creating resources without cleanup plan
const wastefulApproach = {
  development: "EC2 instances running 24/7",
  testing: "RDS instances for each test",
  experiments: "Lambda functions with high memory",
  logs: "CloudWatch logs growing indefinitely",
};

// Result: $200+ monthly bill for unused resources
```

**Why It Happens:**

- "I'll clean it up later" mentality
- No systematic cleanup process
- Forgetting about background resources
- Development resources left running

### The Solution

**1. Daily Cleanup Script**

```bash
#!/bin/bash
# daily-cleanup.sh - Run this every morning

echo "=== Daily AWS Cleanup Report ==="
echo "Date: $(date)"

# Stop unused EC2 instances (older than 1 day, tagged as dev)
echo "Stopping old development EC2 instances..."
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
              "Name=tag:Environment,Values=dev" \
    --query 'Reservations[].Instances[?LaunchTime<`2024-01-01`][InstanceId]' \
    --output text | xargs -r aws ec2 stop-instances --instance-ids

# Delete empty S3 buckets
echo "Cleaning up empty S3 buckets..."
aws s3api list-buckets --query 'Buckets[].Name' --output text | \
while read bucket; do
    if [ $(aws s3 ls s3://$bucket 2>/dev/null | wc -l) -eq 0 ]; then
        echo "Deleting empty bucket: $bucket"
        aws s3 rb s3://$bucket 2>/dev/null
    fi
done

# Clean old CloudWatch logs (older than 30 days)
echo "Cleaning old CloudWatch logs..."
aws logs describe-log-groups \
    --query 'logGroups[?creationTime<`'$(date -d '30 days ago' +%s)'000`].logGroupName' \
    --output text | xargs -r -I {} aws logs delete-log-group --log-group-name {}

echo "Cleanup complete!"
```

**2. Resource Tagging Strategy**

```typescript
// Always tag your resources
const resourceTags = {
  Environment: 'dev' | 'staging' | 'prod',
  Project: 'qr-generator',
  Owner: 'your-email@example.com',
  AutoDelete: 'true',  // For cleanup scripts
  CostCenter: 'personal'
};

// AWS CLI example
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t2.micro \
    --tag-specifications 'ResourceType=instance,Tags=[
        {Key=Environment,Value=dev},
        {Key=AutoDelete,Value=true},
        {Key=Project,Value=qr-generator}
    ]'
```

**3. Automated Cleanup with Lambda**

```typescript
// Lambda function for weekly cleanup
export const handler = async (event: any) => {
  const aws = require("aws-sdk");
  const ec2 = new aws.EC2();

  // Stop instances tagged with AutoDelete=true and older than 7 days
  const instances = await ec2
    .describeInstances({
      Filters: [
        { Name: "tag:AutoDelete", Values: ["true"] },
        { Name: "instance-state-name", Values: ["running"] },
      ],
    })
    .promise();

  const oldInstances = instances.Reservations.flatMap(
    (r) => r.Instances,
  ).filter((i) => {
    const launchTime = new Date(i.LaunchTime);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return launchTime < weekAgo;
  });

  if (oldInstances.length > 0) {
    await ec2
      .terminateInstances({
        InstanceIds: oldInstances.map((i) => i.InstanceId),
      })
      .promise();

    console.log(`Terminated ${oldInstances.length} old instances`);
  }
};
```

---

## Pitfall #3: Public S3 Buckets (Security Risk!)

### The Problem

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

**Why It Happens:**

- Quick fix to solve access issues
- Misunderstanding S3 permissions
- Copy-pasting bucket policies from tutorials
- "Just make it work" mentality

**The Risk:**

- Data breaches and leaks
- Compliance violations
- Cryptocurrency mining abuse
- Massive unexpected bills

### The Solution

**1. Block All Public Access (Default)**

```bash
# Check current bucket settings
aws s3api get-public-access-block --bucket my-bucket

# Block ALL public access (recommended for most cases)
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

**2. Use Signed URLs Instead**

```typescript
// Generate signed URLs for temporary access
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-east-1" });

export const getSecureFileUrl = async (bucketName: string, key: string) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  // URL valid for 1 hour
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return signedUrl;
};
```

**3. Proper Access Patterns**

```typescript
// Good: Specific access for specific users
const secureBucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: {
        AWS: "arn:aws:iam::ACCOUNT-ID:user/specific-user",
      },
      Action: "s3:GetObject",
      Resource: "arn:aws:s3:::my-bucket/public/*",
    },
    {
      Effect: "Allow",
      Principal: {
        AWS: "arn:aws:iam::ACCOUNT-ID:root",
      },
      Action: "s3:*",
      Resource: ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"],
    },
  ],
};

// Bad: Wide-open access
const insecurePolicy = {
  Principal: "*", // Never do this!
  Action: "s3:*", // Or this!
};
```

---

## Pitfall #4: Hardcoded Secrets

### The Problem

```typescript
// NEVER do this!
const badConfig = {
  databaseUrl: "postgresql://user:password123@host:5432/db",
  apiKey: "sk-1234567890abcdef",
  jwtSecret: "my-super-secret-key",
  awsAccessKey: "AKIA....", // Disaster waiting to happen
  stripeKey: "sk_live_...", // Your money will disappear
};

// Committed to GitHub = Immediate bot attacks
```

**Why It Happens:**

- "Just for testing" that becomes permanent
- Not understanding environment variables
- Copying examples from tutorials
- Rush to make things work

**The Consequences:**

- GitHub bots find secrets in minutes
- Cryptocurrency mining on your account
- Database breaches
- API abuse and huge bills

### The Solution

**1. Environment Variables (Basic)**

```typescript
// Good: Use environment variables
const goodConfig = {
    databaseUrl: process.env.DATABASE_URL,
    apiKey: process.env.API_KEY,
    jwtSecret: process.env.JWT_SECRET
};

// .env.local (never commit to Git)
DATABASE_URL=postgresql://user:password@localhost:5432/db
API_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
```

**2. AWS Systems Manager (Better)**

```typescript
// Best: Use AWS Parameter Store
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

class SecretManager {
  private ssmClient: SSMClient;

  constructor() {
    this.ssmClient = new SSMClient({ region: "us-east-1" });
  }

  async getSecret(parameterName: string): Promise<string> {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    });

    const response = await this.ssmClient.send(command);
    return response.Parameter?.Value || "";
  }
}

// Usage
const secrets = new SecretManager();
const dbPassword = await secrets.getSecret("/myapp/db/password");
const apiKey = await secrets.getSecret("/myapp/api/key");
```

**3. Secret Detection and Prevention**

```bash
# Install git-secrets to prevent committing secrets
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && make install

# Set up git-secrets in your repo
cd your-project
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'sk-[a-zA-Z0-9]{32}'  # Stripe keys
git secrets --add '[A-Za-z0-9]{32}'      # Generic 32-char secrets

# Scan existing commits
git secrets --scan-history
```

**4. .gitignore Best Practices**

```bash
# .gitignore - Always include these
.env
.env.local
.env.*.local
config/secrets.json
*.pem
*.key
.aws/
credentials
amplifyconfiguration.json
aws-exports.js

# Check what's being tracked
git ls-files | grep -E '\.(env|key|pem)$'
```

---

## Pitfall #5: Over-Provisioned Capacity

### The Problem

```typescript
// Over-provisioning from day 1
const expensiveSetup = {
  dynamodb: {
    readCapacity: 1000, // Way too high for MVP
    writeCapacity: 1000, // $1000+/month
  },
  lambda: {
    memorySize: 3008, // Maximum memory for simple functions
    timeout: 900, // 15 minutes for 5-second tasks
  },
  rds: {
    instanceType: "db.r5.xlarge", // $300+/month
    storage: 1000, // 1TB for MB of data
  },
};
```

**Why It Happens:**

- "Better safe than sorry" mentality
- Not understanding pricing models
- Copying production configs for development
- No usage monitoring

### The Solution

**1. Right-Size for MVPs**

```typescript
// MVP-sized configuration
const mvpSetup = {
  dynamodb: {
    billingMode: "PAY_PER_REQUEST", // Perfect for unpredictable load
    // No capacity units needed
  },
  lambda: {
    memorySize: 256, // Start small, monitor, optimize
    timeout: 30, // Most functions need <30 seconds
  },
  rds: {
    instanceType: "db.t3.micro", // Free tier eligible
    storage: 20, // Start with 20GB
    storageEncrypted: true,
  },
};
```

**2. Monitoring and Optimization**

```bash
# Monitor DynamoDB usage
aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ConsumedReadCapacityUnits \
    --dimensions Name=TableName,Value=MyTable \
    --start-time $(date -d '7 days ago' --iso-8601) \
    --end-time $(date --iso-8601) \
    --period 3600 \
    --statistics Average,Maximum

# Monitor Lambda performance
aws logs filter-log-events \
    --log-group-name /aws/lambda/my-function \
    --filter-pattern "REPORT" \
    --start-time $(date -d '1 day ago' +%s)000
```

**3. Gradual Scaling Strategy**

```typescript
// Scaling timeline for MVP
const scalingPlan = {
  week1: {
    users: "0-100",
    lambda: "256MB memory",
    dynamodb: "on-demand",
    rds: "not needed yet",
  },
  month1: {
    users: "100-1000",
    lambda: "512MB if needed",
    dynamodb: "still on-demand",
    rds: "db.t3.micro if complex queries needed",
  },
  month3: {
    users: "1000+",
    lambda: "optimize based on CloudWatch",
    dynamodb: "consider provisioned capacity",
    rds: "upgrade instance class if needed",
  },
};
```

---

## Prevention Checklist

### Before You Deploy

- [ ] **Region Check**: Verify you're in us-east-1 or us-west-2
- [ ] **Billing Alerts**: Set up $5 and $10 spending alerts
- [ ] **Resource Tags**: Tag everything with Environment, Project, Owner
- [ ] **S3 Security**: Block all public access unless specifically needed
- [ ] **Secrets Audit**: No hardcoded secrets in code
- [ ] **Right-Sizing**: Start with minimum viable resources
- [ ] **Cleanup Plan**: Document how to tear down resources

### Weekly Review (15 minutes)

- [ ] **Cost Explorer**: Check spending trends
- [ ] **Resource Inventory**: List all running resources
- [ ] **Security Scan**: Check S3 bucket permissions
- [ ] **Log Review**: Clean up old CloudWatch logs
- [ ] **Tag Audit**: Ensure all resources are properly tagged
- [ ] **Metric Review**: Check performance metrics for right-sizing

### Emergency Response

**If You Get a Surprise Bill:**

1. **Stop the bleeding**: Identify and stop/delete expensive resources
2. **Check Cost Explorer**: Find the service driving costs
3. **Review CloudTrail**: Look for unexpected API calls
4. **Contact AWS Support**: They can help with unusual charges
5. **Implement controls**: Add more restrictive budgets and policies

**If You Suspect a Security Breach:**

1. **Rotate all credentials** immediately
2. **Check CloudTrail logs** for unauthorized activity
3. **Review IAM policies** and users
4. **Enable GuardDuty** for threat detection
5. **Contact AWS Security** if needed

---

## Key Takeaways

**The Big 5 Rules:**

1. **Pick the right region** and stick with it
2. **Clean up resources** daily, not "someday"
3. **Keep S3 buckets private** unless you have a specific reason
4. **Never hardcode secrets** - use proper secret management
5. **Start small and scale** based on actual usage

**Remember:** These pitfalls account for 90% of MVP failures. Avoid them, and you're already ahead of most builders.

---

[← Back: Best Practices](08-best-practices.md) | [Next: Cost Control →](10-cost-control.md)
