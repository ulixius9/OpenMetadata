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
Clickhouse usage module
"""

import ast

from metadata.generated.schema.entity.services.connections.database.clickhouseConnection import (
    ClickhouseConnection,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.metadataIngestion.workflow import WorkflowConfig
from metadata.ingestion.api.source import InvalidSourceException
from metadata.ingestion.source.database.usage_source import UsageSource
from metadata.utils.sql_queries import CLICKHOUSE_SQL_USAGE_STATEMENT


class ClickhouseUsageSource(UsageSource):
    def __init__(self, config: WorkflowSource, metadata_config: WorkflowConfig):
        super().__init__(config, metadata_config)
        self.sql_stmt = CLICKHOUSE_SQL_USAGE_STATEMENT.format(
            start_time=self.start, end_time=self.end
        )

    @classmethod
    def create(cls, config_dict, metadata_config: WorkflowConfig):
        config: WorkflowSource = WorkflowSource.parse_obj(config_dict)
        connection: ClickhouseConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, ClickhouseConnection):
            raise InvalidSourceException(
                f"Expected ClickhouseConnection, but got {connection}"
            )

        return cls(config, metadata_config)

    def get_database(self, data: dict) -> str:
        """
        Method to fetch database name from row data
        """
        database = "default"
        if data["database_name"]:
            database_list = ast.literal_eval(data["database_name"])
            database = database_list[0] if len(database_list) == 1 else "default"
        return database
