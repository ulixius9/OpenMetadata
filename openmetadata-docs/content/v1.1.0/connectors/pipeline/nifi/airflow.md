---
title: Run Nifi Connector using Airflow SDK
slug: /connectors/pipeline/nifi/airflow
---

# Run Nifi using the metadata CLI

In this section, we provide guides and references to use the Nifi connector.

Configure and schedule Nifi metadata and profiler workflows from the OpenMetadata UI:

- [Requirements](#requirements)
- [Metadata Ingestion](#metadata-ingestion)

## Requirements

{%inlineCallout icon="description" bold="OpenMetadata 0.12 or later" href="/deployment"%}
To deploy OpenMetadata, check the Deployment guides.
{% /inlineCallout %}

To run the Ingestion via the UI you'll need to use the OpenMetadata Ingestion Container, which comes shipped with custom Airflow plugins to handle the workflow deployment.

### Python Requirements

To run the Nifi ingestion, you will need to install:

```bash
pip3 install "openmetadata-ingestion[nifi]"
```

## Metadata Ingestion

All connectors are defined as JSON Schemas.
[Here](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/entity/services/connections/pipeline/nifiConnection.json)
you can find the structure to create a connection to Nifi.

In order to create and run a Metadata Ingestion workflow, we will follow
the steps to create a YAML configuration able to connect to the source,
process the Entities if needed, and reach the OpenMetadata server.

The workflow is modeled around the following
[JSON Schema](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/metadataIngestion/workflow.json)

### 1. Define the YAML Config

This is a sample config for Nifi:

{% codePreview %}

{% codeInfoContainer %}

#### Source Configuration - Service Connection

{% codeInfo srNumber=1 %}

**hostPort**: Pipeline Service Management UI URL
**nifiConfig**: one of
  **1.** Using Basic authentication  
    - **username**: Username to connect to Nifi. This user should be able to send request to the Nifi API and access the `Resources` endpoint.
    - **password**: Password to connect to Nifi.
    - **verifySSL**: Whether SSL verification should be perform when authenticating.
  **2.** Using client certificate authentication
    - **certificateAuthorityPath**: Path to the certificate authority (CA) file. This is the certificate used to store and issue your digital certificate. This is an optional parameter. If omitted SSL verification will be skipped; this can present some sever security issue.
    **important**: This file should be accessible from where the ingestion workflow is running. For example, if you are using OpenMetadata Ingestion Docker container, this file should be in this container.
    - **clientCertificatePath**: Path to the certificate client file.
    **important**: This file should be accessible from where the ingestion workflow is running. For example, if you are using OpenMetadata Ingestion Docker container, this file should be in this container.
    - **clientkeyPath**: Path to the client key file.
    **important**: This file should be accessible from where the ingestion workflow is running. For example, if you are using OpenMetadata Ingestion Docker container, this file should be in this container.

{% /codeInfo %}


#### Source Configuration - Source Config

{% codeInfo srNumber=2 %}

The `sourceConfig` is defined [here](https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/metadataIngestion/pipelineServiceMetadataPipeline.json):

**dbServiceNames**: Database Service Name for the creation of lineage, if the source supports it.

**includeTags**: Set the 'Include Tags' toggle to control whether to include tags as part of metadata ingestion.

**markDeletedPipelines**: Set the Mark Deleted Pipelines toggle to flag pipelines as soft-deleted if they are not present anymore in the source system.

**pipelineFilterPattern** and **chartFilterPattern**: Note that the `pipelineFilterPattern` and `chartFilterPattern` both support regex as include or exclude.

{% /codeInfo %}


#### Sink Configuration

{% codeInfo srNumber=3 %}

To send the metadata to OpenMetadata, it needs to be specified as `type: metadata-rest`.

{% /codeInfo %}

{% partial file="workflow-config.md" /%}

{% /codeInfoContainer %}

{% codeBlock fileName="filename.yaml" %}


```yaml
source:
  type: nifi
  serviceName: nifi_source
  serviceConnection:
    config:
      type: Nifi
      hostPort: my_host:8443
      nifiConfig:
        username: my_username
        password: my_password
        verifySSL: <true or false>
        ## client certificate authentication
        # certificateAuthorityPath: path/to/CA
        # clientCertificatePath: path/to/clientCertificate
        # clientkeyPath: path/to/clientKey

```
```yaml {% srNumber=1 %}
      hostPort: http://localhost:8000
```
```yaml {% srNumber=2 %}
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
```yaml {% srNumber=3 %}
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


{% codeInfo srNumber=5 %}

#### Import necessary modules

The `Workflow` class that is being imported is a part of a metadata ingestion framework, which defines a process of getting data from different sources and ingesting it into a central metadata repository.

Here we are also importing all the basic requirements to parse YAMLs, handle dates and build our DAG.

{% /codeInfo %}

{% codeInfo srNumber=6 %}

**Default arguments for all tasks in the Airflow DAG.** 

- Default arguments dictionary contains default arguments for tasks in the DAG, including the owner's name, email address, number of retries, retry delay, and execution timeout.

{% /codeInfo %}

{% codeInfo srNumber=7 %}

- **config**: Specifies config for the metadata ingestion as we prepare above.

{% /codeInfo %}

{% codeInfo srNumber=8 %}

- **metadata_ingestion_workflow()**: This code defines a function `metadata_ingestion_workflow()` that loads a YAML configuration, creates a `Workflow` object, executes the workflow, checks its status, prints the status to the console, and stops the workflow.

{% /codeInfo %}

{% codeInfo srNumber=9 %}

- **DAG**: creates a DAG using the Airflow framework, and tune the DAG configurations to whatever fits with your requirements
- For more Airflow DAGs creation details visit [here](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html#declaring-a-dag).

{% /codeInfo %}

Note that from connector to connector, this recipe will always be the same.
By updating the `YAML configuration`, you will be able to extract metadata from different sources.

{% /codeInfoContainer %}

{% codeBlock fileName="filename.py" %}

```python {% srNumber=5 %}
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

```python {% srNumber=6 %}
default_args = {
    "owner": "user_name",
    "email": ["username@org.com"],
    "email_on_failure": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=60)
}


```

```python {% srNumber=7 %}
config = """
<your YAML configuration>
"""


```

```python {% srNumber=8 %}
def metadata_ingestion_workflow():
    workflow_config = yaml.safe_load(config)
    workflow = Workflow.create(workflow_config)
    workflow.execute()
    workflow.raise_from_status()
    workflow.print_status()
    workflow.stop()


```

```python {% srNumber=9 %}
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


