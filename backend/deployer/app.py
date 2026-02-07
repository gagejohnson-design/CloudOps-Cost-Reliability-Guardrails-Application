import os
import json
import mimetypes
import boto3
import urllib3

http = urllib3.PoolManager()
s3 = boto3.client("s3")
cf = boto3.client("cloudfront")

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")

def send_cfn_response(event, context, status, data=None, reason=None, physical_id=None):
    response_url = event["ResponseURL"]
    body = {
        "Status": status,
        "Reason": reason or f"See CloudWatch Log Stream: {context.log_stream_name}",
        "PhysicalResourceId": physical_id or context.log_stream_name,
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "NoEcho": False,
        "Data": data or {},
    }
    encoded = json.dumps(body).encode("utf-8")
    headers = {
        "content-type": "",
        "content-length": str(len(encoded)),
    }
    http.request("PUT", response_url, body=encoded, headers=headers)

def list_all_objects(bucket):
    keys = []
    token = None
    while True:
        kwargs = {"Bucket": bucket, "MaxKeys": 1000}
        if token:
            kwargs["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kwargs)
        for obj in resp.get("Contents", []):
            keys.append(obj["Key"])
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return keys

def delete_all_objects(bucket):
    keys = list_all_objects(bucket)
    for i in range(0, len(keys), 1000):
        chunk = keys[i:i+1000]
        s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": k} for k in chunk], "Quiet": True},
        )

def build_config_js(props):
    # props passed from CloudFormation
    region = props["Region"]
    cloudfront_domain = props["CloudFrontDomainName"]
    domain_prefix = props["CognitoDomainPrefix"]
    client_id = props["UserPoolClientId"]
    api_id = props["RestApiId"]
    stage = props.get("StageName", "Prod")

    cognito_domain = f"https://{domain_prefix}.auth.{region}.amazoncognito.com"
    app_url = f"https://{cloudfront_domain}"
    redirect_uri = f"{app_url}/callback"
    api_base = f"https://{api_id}.execute-api.{region}.amazonaws.com/{stage}"

    return (
        "window.CLOUDOPS_CONFIG = {\n"
        f'  cognitoDomain: "{cognito_domain}",\n'
        f'  clientId: "{client_id}",\n'
        f'  redirectUri: "{redirect_uri}",\n'
        f'  apiBaseUrl: "{api_base}"\n'
        "};\n"
    )

def upload_file(bucket, key, content_bytes, content_type):
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=content_bytes,
        ContentType=content_type or "application/octet-stream",
        CacheControl="max-age=60",  # low cache for V1 iteration; you can raise later
    )

def sync_frontend(bucket, props):
    # Upload all frontend files except config.js (we generate it)
    for root, _, files in os.walk(FRONTEND_DIR):
        for name in files:
            if name.startswith("."):
                continue
            if name == "config.js":
                continue

            full = os.path.join(root, name)
            rel = os.path.relpath(full, FRONTEND_DIR).replace("\\", "/")
            with open(full, "rb") as f:
                data = f.read()

            ctype, _ = mimetypes.guess_type(rel)
            upload_file(bucket, rel, data, ctype)

    # Generate and upload config.js
    cfg_js = build_config_js(props).encode("utf-8")
    upload_file(bucket, "config.js", cfg_js, "application/javascript")

def invalidate(distribution_id):
    # Create a CF invalidation so index/config updates show immediately
    cf.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "CallerReference": str(boto3.client("sts").get_caller_identity()["Account"]) + "-" + os.urandom(8).hex(),
            "Paths": {"Quantity": 1, "Items": ["/*"]},
        },
    )

def handler(event, context):
    try:
        req_type = event["RequestType"]
        props = event.get("ResourceProperties", {})
        bucket = props["FrontendBucketName"]
        dist_id = props["CloudFrontDistributionId"]

        if req_type in ("Create", "Update"):
            sync_frontend(bucket, props)
            invalidate(dist_id)
            send_cfn_response(event, context, "SUCCESS", data={"Message": "Frontend deployed"})
            return

        if req_type == "Delete":
            # Important: empty bucket so stack deletion doesn't fail
            try:
                delete_all_objects(bucket)
            except Exception:
                # If bucket already gone or access blocked, don't brick deletion
                pass
            send_cfn_response(event, context, "SUCCESS", data={"Message": "Frontend cleaned"})
            return

        send_cfn_response(event, context, "SUCCESS", data={"Message": "No-op"})
    except Exception as e:
        send_cfn_response(event, context, "FAILED", reason=str(e))
