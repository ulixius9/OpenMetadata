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
Snowflake usage module
"""

from datetime import timedelta
from typing import Any, Dict, Iterable, Iterator, Union

from metadata.generated.schema.entity.services.connections.database.snowflakeConnection import (
    SnowflakeConnection,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.services.databaseService import (
    DatabaseServiceType,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.metadataIngestion.workflow import WorkflowConfig
from metadata.ingestion.api.source import InvalidSourceException

# This import verifies that the dependencies are available.
from metadata.ingestion.source.database.usage_source import UsageSource
from metadata.utils.connections import get_connection
from metadata.utils.logger import ingestion_logger
from metadata.utils.sql_queries import SNOWFLAKE_SQL_STATEMENT

logger = ingestion_logger()


class SnowflakeUsageSource(UsageSource):
    # SELECT statement from mysql information_schema
    # to extract table and column metadata
    SQL_STATEMENT = SNOWFLAKE_SQL_STATEMENT

    # CONFIG KEYS
    WHERE_CLAUSE_SUFFIX_KEY = "where_clause"
    CLUSTER_SOURCE = "cluster_source"
    CLUSTER_KEY = "cluster_key"
    USE_CATALOG_AS_CLUSTER_NAME = "use_catalog_as_cluster_name"
    DATABASE_KEY = "database_key"
    SERVICE_TYPE = DatabaseServiceType.Snowflake.value
    DEFAULT_CLUSTER_SOURCE = "CURRENT_DATABASE()"

    def __init__(self, config: WorkflowSource, metadata_config: OpenMetadataConnection):
        super().__init__(config, metadata_config)
        self.end = self.end + timedelta(days=1)
        self.sql_stmt = SnowflakeUsageSource.SQL_STATEMENT.format(
            start_date=self.start,
            end_date=self.end,
            result_limit=self.config.sourceConfig.config.resultLimit,
        )
        self._extract_iter: Union[None, Iterator] = None
        self._database = "Snowflake"

    @classmethod
    def create(cls, config_dict, metadata_config: WorkflowConfig):
        config: WorkflowSource = WorkflowSource.parse_obj(config_dict)
        connection: SnowflakeConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, SnowflakeConnection):
            raise InvalidSourceException(
                f"Expected SnowflakeConnection, but got {connection}"
            )
        return cls(config, metadata_config)

    def _get_raw_extract_iter(self) -> Iterable[Dict[str, Any]]:
        if self.config.serviceConnection.__root__.config.database:
            yield from super(SnowflakeUsageSource, self)._get_raw_extract_iter()
        else:
            query = "SHOW DATABASES"
            results = self.engine.execute(query)
            for res in results:
                row = list(res)
                use_db_query = f"USE DATABASE {row[1]}"
                self.engine.execute(use_db_query)
                logger.info(f"Ingesting from database: {row[1]}")
                self.config.serviceConnection.__root__.config.database = row[1]
                self.engine = get_connection(self.connection)
                rows = self.engine.execute(self.sql_stmt)
                for row in rows:
                    yield row

    def get_database(self, data: dict) -> str:
        """
        Method to get database name
        """
        if not data["database_name"] and self.connection.database:
            return self.connection.database
        return data["database_name"]

    def get_aborted_status(self, data: dict) -> bool:
        """
        Method to get aborted status of query
        """
        return "1969" in str(data["end_time"])
