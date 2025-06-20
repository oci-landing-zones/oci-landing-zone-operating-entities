import oci
from io import BytesIO
import datetime
import gzip
import pathlib

def send_to_bucket(destination_bucket):
    yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
    formatted_yesterday = yesterday.strftime('%Y/%m/%d')
    csv_date_format = yesterday.strftime('%Y_%m_%d')

    reporting_namespace = 'bling'
    prefix_file = f"FOCUS Reports/{formatted_yesterday}"


    # Get the list of reports
    signer = oci.auth.signers.get_resource_principals_signer()
    object_storage = oci.object_storage.ObjectStorageClient({},signer=signer)
    reporting_bucket = signer.tenancy_id
    report_bucket_objects = oci.pagination.list_call_get_all_results(object_storage.list_objects, reporting_namespace, reporting_bucket, prefix=prefix_file)

    destination_namespace = object_storage.get_namespace(compartment_id=reporting_bucket).data
    destination_bucket_name  = destination_bucket


    for o in report_bucket_objects.data.objects:
        print('Found file ' + o.name,flush=True)
        object_details = object_storage.get_object(reporting_namespace, reporting_bucket, o.name)

        # Upload the decompressed content to the destination bucket
        filename = pathlib.Path(o.name).stem
        formatted_filename = f"FOCUS_{csv_date_format}_{filename}"
        try:
            # Check if the object already exists in the destination bucket
            object_storage.head_object(destination_namespace, destination_bucket_name, formatted_filename)
            print(f"Object {formatted_filename} already exists. Skipping...",flush=True)
        except oci.exceptions.ServiceError as e:
            if e.status == 404:
                # Decompress the GZIP file content
                with gzip.GzipFile(fileobj=BytesIO(object_details.data.content)) as f:
                    decompressed_content = f.read()
                # Object does not exist, upload it
                object_storage.put_object(destination_namespace, destination_bucket_name, formatted_filename, decompressed_content)
                print(f"Uploaded {formatted_filename}",flush=True)
            else:
                raise

def handler(ctx, data: BytesIO = None):
    cfg = dict(ctx.Config())

    # fetch details from function config
    bucket = cfg['bucket']
    send_to_bucket(bucket)