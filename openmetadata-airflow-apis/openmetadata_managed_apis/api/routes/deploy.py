#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Deploy the DAG and scan it with the scheduler
"""
import traceback

from airflow.api_connexion import security
from airflow.security import permissions
from airflow.www.app import csrf
from flask import Response, request
from metadata.generated.schema.entity.services.ingestionPipelines.ingestionPipeline import (
    IngestionPipeline,
)
from openmetadata_managed_apis.api.app import blueprint
from openmetadata_managed_apis.api.response import ApiResponse
from openmetadata_managed_apis.operations.deploy import DagDeployer
from openmetadata_managed_apis.utils.logger import routes_logger
from pydantic import ValidationError

logger = routes_logger()


@blueprint.route("/deploy", methods=["POST"])
@csrf.exempt
@security.requires_access([(permissions.ACTION_CAN_CREATE, permissions.RESOURCE_DAG)])
def deploy_dag() -> Response:
    """
    Custom Function for the deploy_dag API
    Creates workflow dag based on workflow dag file and refreshes
    the session
    """

    json_request = request.get_json()

    try:
        ingestion_pipeline = IngestionPipeline(**json_request)

        deployer = DagDeployer(ingestion_pipeline)
        response = deployer.deploy()

        return response

    except ValidationError as err:
        logger.info(f"json request failed: {json_request}")
        return ApiResponse.error(
            status=ApiResponse.STATUS_BAD_REQUEST,
            error=f"Request Validation Error parsing payload. IngestionPipeline expected - {err}",
        )

    except Exception as err:
        logger.info(f"json request failed: {json_request}")
        logger.error(traceback.format_exc())
        return ApiResponse.error(
            status=ApiResponse.STATUS_SERVER_ERROR,
            error=f"Internal error while deploying- {err}",
        )
