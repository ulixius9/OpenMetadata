---
title: Run Glue Pipeline Connector using Airflow SDK
slug: /connectors/pipeline/glue-pipeline/airflow
---

# Run Glue Pipeline using the Airflow SDK

In this section, we provide guides and references to use the Glue connector.

Configure and schedule Glue metadata and profiler workflows from the OpenMetadata UI:

- [Requirements](#requirements)
- [Metadata Ingestion](#metadata-ingestion)

## Requirements

{%inlineCallout icon="description" bold="OpenMetadata 0.12 or later" href="/deployment"%}
To deploy OpenMetadata, check the Deployment guides.
{%/inlineCallout%}

The Glue connector ingests metadata through AWS [Boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue.html) Client.
We will ingest Workflows, its jobs and their run status.

The user must have the following permissions for the ingestion to run successfully:

- `glue:ListWorkflows`
- `glue:GetWorkflow`
- `glue:GetJobRuns`

### Python Requirements

To run the Glue ingestion, you will need to install:

```bash
pip3 install "openmetadata-ingestion[glue]"
```

## Metadata Ingestion

All connectors are defined as JSON Schemas.
[Here](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/entity/services/connections/database/glueConnection.json)
you can find the structure to create a connection to Glue.

In order to create and run a Metadata Ingestion workflow, we will follow
the steps to create a YAML configuration able to connect to the source,
process the Entities if needed, and reach the OpenMetadata server.

The workflow is modeled around the following
[JSON Schema](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/metadataIngestion/workflow.json)

### 1. Define the YAML Config

This is a sample config for Glue:

{% codePreview %}

{% codeInfoContainer %}

#### Source Configuration - Service Connection

{% codeInfo srNumber=1 %}


**awsAccessKeyId**: Enter your secure access key ID for your Glue connection. The specified key ID should be
  authorized to read all databases you want to include in the metadata ingestion workflow.

{% /codeInfo %}

{% codeInfo srNumber=2 %}

**awsSecretAccessKey**: Enter the Secret Access Key (the passcode key pair to the key ID from above).


{% /codeInfo %}

{% codeInfo srNumber=3 %}

**awsRegion**: Enter the location of the amazon cluster that your data and account are associated with.

{% /codeInfo %}

{% codeInfo srNumber=4 %}

**awsSessionToken**: The AWS session token is an optional parameter. If you want, enter the details of your temporary
  session token.

{% /codeInfo %}

{% codeInfo srNumber=5 %}

**endPointURL**: Your Glue connector will automatically determine the AWS Glue endpoint URL based on the region. You
  may override this behavior by entering a value to the endpoint URL.


{% /codeInfo %}


#### Source Configuration - Source Config

{% codeInfo srNumber=6 %}

The `sourceConfig` is defined [here](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/metadataIngestion/pipelineServiceMetadataPipeline.json):

**dbServiceNames**: Database Service Name for the creation of lineage, if the source supports it.

**includeTags**: Set the 'Include Tags' toggle to control whether to include tags as part of metadata ingestion.

**markDeletedPipelines**: Set the Mark Deleted Pipelines toggle to flag pipelines as soft-deleted if they are not present anymore in the source system.

**pipelineFilterPattern** and **chartFilterPattern**: Note that the `pipelineFilterPattern` and `chartFilterPattern` both support regex as include or exclude.

{% /codeInfo %}


#### Sink Configuration

{% codeInfo srNumber=7 %}

To send the metadata to OpenMetadata, it needs to be specified as `type: metadata-rest`.

{% /codeInfo %}

{% partial file="workflow-config.md" /%}

{% /codeInfoContainer %}

{% codeBlock fileName="filename.yaml" %}

```yaml
source:
  type: glue
  serviceName: local_glue
  serviceConnection:
    config:
      type: Glue
      awsConfig:
```
```yaml {% srNumber=1 %}
        awsAccessKeyId: KEY
```
```yaml {% srNumber=2 %}
        awsSecretAccessKey: SECRET
```
```yaml {% srNumber=3 %}
        awsRegion: us-east-2
```
```yaml {% srNumber=4 %}
        # awsSessionToken: TOKEN
```
```yaml {% srNumber=5 %}
        # endPointURL: https://glue.us-east-2.amazonaws.com/
```
```yaml {% srNumber=6 %}
  sourceConfig:
    config:
      type: PipelineMetadata
      # markDeletedPipelines: True
      # includeTags: True
      # includeLineage: true
      # pipelineFilterPattern:
      #   includes:
      #     - pipeline1
      #     - pipeline2
      #   excludes:
      #     - pipeline3
      #     - pipeline4
```
```yaml {% srNumber=7 %}
sink:
  type: metadata-rest
  config: {}
```

{% partial file="workflow-config-yaml.md" /%}

{% /codeBlock %}

{% /codePreview %}

### 2. Prepare the Ingestion DAG

Create a Python file in your Airflow DAGs directory with the following contents:

{% codePreview %}

{% codeInfoContainer %}


{% codeInfo srNumber=9 %}

#### Import necessary modules

The `Workflow` class that is being imported is a part of a metadata ingestion framework, which defines a process of getting data from different sources and ingesting it into a central metadata repository.

Here we are also importing all the basic requirements to parse YAMLs, handle dates and build our DAG.

{% /codeInfo %}

{% codeInfo srNumber=10 %}

**Default arguments for all tasks in the Airflow DAG.** 

- Default arguments dictionary contains default arguments for tasks in the DAG, including the owner's name, email address, number of retries, retry delay, and execution timeout.

{% /codeInfo %}

{% codeInfo srNumber=11 %}

- **config**: Specifies config for the metadata ingestion as we prepare above.

{% /codeInfo %}

{% codeInfo srNumber=12 %}

- **metadata_ingestion_workflow()**: This code defines a function `metadata_ingestion_workflow()` that loads a YAML configuration, creates a `Workflow` object, executes the workflow, checks its status, prints the status to the console, and stops the workflow.

{% /codeInfo %}

{% codeInfo srNumber=13 %}

- **DAG**: creates a DAG using the Airflow framework, and tune the DAG configurations to whatever fits with your requirements
- For more Airflow DAGs creation details visit [here](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html#declaring-a-dag).

{% /codeInfo %}

Note that from connector to connector, this recipe will always be the same.
By updating the `YAML configuration`, you will be able to extract metadata from different sources.

{% /codeInfoContainer %}

{% codeBlock fileName="filename.py" %}

```python {% srNumber=9 %}
import pathlib
import yaml
from datetime import timedelta
from airflow import DAG
from metadata.config.common import load_config_file
from metadata.ingestion.api.workflow import Workflow
from airflow.utils.dates import days_ago

try:
    from airflow.operators.python import PythonOperator
except ModuleNotFoundError:
    from airflow.operators.python_operator import PythonOperator


```

```python {% srNumber=10 %}
default_args = {
    "owner": "user_name",
    "email": ["username@org.com"],
    "email_on_failure": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=60)
}


```

```python {% srNumber=11 %}
config = """
<your YAML configuration>
"""


```

```python {% srNumber=12 %}
def metadata_ingestion_workflow():
    workflow_config = yaml.safe_load(config)
    workflow = Workflow.create(workflow_config)
    workflow.execute()
    workflow.raise_from_status()
    workflow.print_status()
    workflow.stop()


```

```python {% srNumber=13 %}
with DAG(
    "sample_data",
    default_args=default_args,
    description="An example DAG which runs a OpenMetadata ingestion workflow",
    start_date=days_ago(1),
    is_paused_upon_creation=False,
    schedule_interval='*/5 * * * *',
    catchup=False,
) as dag:
    ingest_task = PythonOperator(
        task_id="ingest_using_recipe",
        python_callable=metadata_ingestion_workflow,
    )


```

{% /codeBlock %}

{% /codePreview %}

