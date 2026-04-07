#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { UpfrontJobsStack } from '../lib/upfrontjobs-stack';

const app = new cdk.App();

new UpfrontJobsStack(app, 'UpfrontJobsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-2',
  },
});
