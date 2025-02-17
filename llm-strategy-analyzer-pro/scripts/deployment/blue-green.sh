#!/bin/bash
# Blue-Green Deployment for AWS
ENV=$1
VERSION=$2

# Switch ELB to new instances
aws elbv2 modify-listener --listener-arn $LB_LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$(terraform output -raw tg_green_arn)

# Wait for new instances to stabilize
echo "Waiting 5 minutes for new version stabilization..."
sleep 300

# Check new instance health
HEALTHY_COUNT=$(aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw tg_green_arn) \
  --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`].Target.Id' \
  --output text | wc -w)

if [ $HEALTHY_COUNT -lt 2 ]; then
  echo "CRITICAL: New version unstable! Rolling back..."
  aws elbv2 modify-listener --listener-arn $LB_LISTENER_ARN \
    --default-actions Type=forward,TargetGroupArn=$(terraform output -raw tg_blue_arn)
  exit 1
fi

# Deregister old instances
aws elbv2 deregister-targets --target-group-arn $(terraform output -raw tg_blue_arn) \
  --targets Id=$(terraform output -raw old_instance_ids)