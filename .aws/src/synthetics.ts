// to be moved into own terraform module, preferably HCL that is then consumed by CDKTF in the app instatiation.
import { config } from './config';
import * as path from 'path';
import { CloudwatchMetricAlarm } from '@cdktf/provider-aws/lib/cloudwatch-metric-alarm';
import { DataArchiveFile } from '@cdktf/provider-archive/lib/data-archive-file';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicyAttachment } from '@cdktf/provider-aws/lib/iam-role-policy-attachment';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { SyntheticsCanary } from '@cdktf/provider-aws/lib/synthetics-canary';
import { AssetType, TerraformAsset } from 'cdktf';
import { Construct } from 'constructs';

interface syntheticQueryConfig {
  data?: string;
  endpoint?: string;
  jmespath?: string;
  response?: string;
}

interface syntheticUptimeConfig {
  response?: string;
  url?: string;
}

interface syntheticCheckConfigs {
  query: syntheticQueryConfig[];
  securityGroupIds?: string[];
  subnetIds?: string[];
  uptime: syntheticUptimeConfig[];
}

/**
 * Create additional monitoring
 * @param app
 * @param provider
 */
export class APIMonitoring extends Construct {
  public readonly scope: Construct;
  public readonly name: string;

  constructor(scope: Construct, name: string) {
    super(scope, name);
  }

  createSyntheticChecks(
    checkConfigs: syntheticCheckConfigs,
    snsCriticalAlarmTopicARN = ''
  ) {
    const syntheticArtifactsS3 = new S3Bucket(
      this,
      'synthetic_check_artifacts',
      {
        bucket: `pocket-${config.prefix.toLowerCase()}-synthetic-checks`,
        lifecycleRule: [
          {
            enabled: true,
            expiration: {
              days: 30,
            },
            id: '30-day-retention',
          },
        ],
      }
    );

    const syntheticCode = new TerraformAsset(this, 'synthetic_check_asset', {
      path: path.resolve(`${__dirname}`, 'files'),
      type: AssetType.DIRECTORY,
    });

    const syntheticZipFile = new DataArchiveFile(this, 'synthetic_check_zip', {
      outputPath: `generated-archives/synthetic-${syntheticCode.assetHash}.zip`,
      sourceDir: syntheticCode.path,
      type: 'zip',
    });

    // behind the scenes, Cloudwatch Synthetics are AWS-managed Lambdas
    const dataSyntheticAssume = new DataAwsIamPolicyDocument(
      this,
      'synthetic_check_assume',
      {
        version: '2012-10-17',
        statement: [
          {
            effect: 'Allow',
            actions: ['sts:AssumeRole'],

            principals: [
              {
                identifiers: ['lambda.amazonaws.com'],
                type: 'Service',
              },
            ],
          },
        ],
      }
    );

    const syntheticRole = new IamRole(this, 'synthetic_check_role', {
      name: `pocket-${config.prefix.toLowerCase()}-synthetic-check`,

      assumeRolePolicy: dataSyntheticAssume.json,
      tags: config.tags,
    });

    // puts artifacts into s3, stores logs, pushes metrics to Cloudwatch
    // also create networkinterfaces if synthetic check in VPC
    const dataSyntheticAccess = new DataAwsIamPolicyDocument(
      this,
      'synthetic_check_access',
      {
        version: '2012-10-17',
        statement: [
          {
            effect: 'Allow',
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            resources: ['*'],
          },
          {
            actions: ['s3:PutObject', 's3:GetObject'],
            resources: [`${syntheticArtifactsS3.arn}/*`],
          },
          {
            actions: ['s3:GetBucketLocation'],
            resources: [syntheticArtifactsS3.arn],
          },
          {
            actions: ['s3:ListAllMyBuckets'],
            resources: ['*'],
          },
          {
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
            condition: [
              {
                test: 'StringEquals',
                values: ['CloudWatchSynthetics'],
                variable: 'cloudwatch:namespace',
              },
            ],
          },
          {
            actions: [
              'ec2:AttachNetworkInterface',
              'ec2:CreateNetworkInterface',
              'ec2:DeleteNetworkInterface',
              'ec2:DescribeNetworkInterfaces',
            ],
            resources: ['*'],
          },
        ],
      }
    );

    const syntheticAccessPolicy = new IamPolicy(
      this,
      'synthetic_check_access_policy',
      {
        name: `pocket-${config.prefix.toLowerCase()}-synthetic-check-access`,
        policy: dataSyntheticAccess.json,
      }
    );

    new IamRolePolicyAttachment(this, 'synthetic_check_access_attach', {
      role: syntheticRole.id,
      policyArn: syntheticAccessPolicy.arn,
    });

    for (const uptimeConfig of checkConfigs.uptime) {
      const count = checkConfigs.uptime.indexOf(uptimeConfig);
      const check = new SyntheticsCanary(this, 'synthetic_check_uptime', {
        name: `${config.shortName.toLowerCase()}-${config.environment.toLowerCase()}-uptime-${count}`, // limit of 21 characters
        artifactS3Location: `s3://${syntheticArtifactsS3.bucket}/`,
        executionRoleArn: syntheticRole.arn,
        handler: 'synthetic.uptime',
        runConfig: {
          environmentVariables: {
            UPTIME_BODY: uptimeConfig.response,
            UPTIME_URL: uptimeConfig.url,
          },
          timeoutInSeconds: 180, // 3 minute timeout
        },
        runtimeVersion: 'syn-nodejs-puppeteer-4.0',
        schedule: {
          expression: 'rate(5 minutes)', // run every 5 minutes
        },
        startCanary: true,
        vpcConfig: {
          subnetIds: checkConfigs.subnetIds,
          securityGroupIds: checkConfigs.securityGroupIds,
        },
        zipFile: syntheticZipFile.outputPath,
      });

      new CloudwatchMetricAlarm(this, 'synthetic_check_alarm_uptime', {
        alarmDescription: `Alert when ${check.name} canary success percentage has decreased below 66% in the last 15 minutes`,
        alarmName: check.name,
        comparisonOperator: 'LessThanThreshold',
        dimensions: {
          CanaryName: check.name,
        },
        evaluationPeriods: 3,
        metricName: 'SuccessPercent',
        namespace: 'CloudWatchSynthetics',
        period: 300, // 15 minutes
        statistic: 'Average',
        threshold: 66,
        treatMissingData: 'breaching',

        alarmActions: [snsCriticalAlarmTopicARN],
        insufficientDataActions: [],
        okActions: [snsCriticalAlarmTopicARN],
      });
    }

    for (const queryConfig of checkConfigs.query) {
      const count = checkConfigs.query.indexOf(queryConfig);
      const check = new SyntheticsCanary(this, 'synthetic_check_query', {
        name: `${config.shortName.toLowerCase()}-${config.environment.toLowerCase()}-query-${count}`, // limit of 21 characters
        artifactS3Location: `s3://${syntheticArtifactsS3.bucket}/`,
        executionRoleArn: syntheticRole.arn,
        handler: 'synthetic.query',
        runConfig: {
          environmentVariables: {
            GRAPHQL_ENDPOINT: queryConfig.endpoint,
            GRAPHQL_JMESPATH: queryConfig.jmespath,
            GRAPHQL_QUERY: queryConfig.data,
            GRAPHQL_RESPONSE: queryConfig.response,
          },
          timeoutInSeconds: 180, // 3 minute timeout
        },
        runtimeVersion: 'syn-nodejs-puppeteer-4.0',
        schedule: {
          expression: 'rate(5 minutes)', // run every 5 minutes
        },
        startCanary: true,
        vpcConfig: {
          subnetIds: checkConfigs.subnetIds,
          securityGroupIds: checkConfigs.securityGroupIds,
        },
        zipFile: syntheticZipFile.outputPath,
      });

      new CloudwatchMetricAlarm(this, 'synthetic_check_alarm_query', {
        alarmDescription: `Alert when ${check.name} canary success percentage has decreased below 66% in the last 15 minutes`,
        alarmName: check.name,

        comparisonOperator: 'LessThanThreshold',
        dimensions: {
          CanaryName: check.name,
        },
        evaluationPeriods: 3,
        metricName: 'SuccessPercent',
        namespace: 'CloudWatchSynthetics',
        period: 300, // 15 minutes
        statistic: 'Average',
        threshold: 66,
        treatMissingData: 'breaching',

        alarmActions: [snsCriticalAlarmTopicARN],
        insufficientDataActions: [],
        okActions: [snsCriticalAlarmTopicARN],
      });
    }
  }
}
