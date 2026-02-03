#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${1:-CLOUDOPS}"
REGION="${2:-us-east-2}"

# Get outputs
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text 2>/dev/null || true)

DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text 2>/dev/null || true)

APP_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" --output text 2>/dev/null || true)

if [[ -z "${BUCKET}" || "${BUCKET}" == "None" ]]; then
  echo "Missing Output FrontendBucketName. Add it to template Outputs, or paste bucket name manually."
  exit 1
fi

echo "Syncing frontend/ to s3://${BUCKET} ..."
aws s3 sync frontend "s3://${BUCKET}" --delete

if [[ -n "${DIST_ID}" && "${DIST_ID}" != "None" ]]; then
  echo "Invalidating CloudFront distribution ${DIST_ID} ..."
  aws cloudfront create-invalidation --distribution-id "${DIST_ID}" --paths "/*" >/dev/null
fi

echo "Done."
if [[ -n "${APP_URL}" && "${APP_URL}" != "None" ]]; then
  echo "App: ${APP_URL}"
fi
