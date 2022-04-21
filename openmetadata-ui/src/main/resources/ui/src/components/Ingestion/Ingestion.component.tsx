/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import cronstrue from 'cronstrue';
import { capitalize, isNil, isUndefined, lowerCase } from 'lodash';
import React, { useCallback, useState } from 'react';
import { useAuthContext } from '../../authentication/auth-provider/AuthProvider';
import {
  PAGE_SIZE,
  TITLE_FOR_NON_ADMIN_ACTION,
} from '../../constants/constants';
import { FormSubmitType } from '../../enums/form.enum';
import {
  IngestionPipeline,
  PipelineType,
} from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { useAuth } from '../../hooks/authHooks';
import { isEven } from '../../utils/CommonUtils';
import { showInfoToast } from '../../utils/ToastUtils';
import AddIngestion from '../AddIngestion/AddIngestion.component';
import { Button } from '../buttons/Button/Button';
import NextPrevious from '../common/next-previous/NextPrevious';
import NonAdminAction from '../common/non-admin-action/NonAdminAction';
import PopOver from '../common/popover/PopOver';
import Searchbar from '../common/searchbar/Searchbar';
import Loader from '../Loader/Loader';
import EntityDeleteModal from '../Modals/EntityDeleteModal/EntityDeleteModal';
import { IngestionProps, ModifiedConfig } from './ingestion.interface';

const Ingestion: React.FC<IngestionProps> = ({
  serviceDetails,
  serviceName,
  serviceCategory,
  ingestionList,
  isRequiredDetailsAvailable,
  deleteIngestion,
  triggerIngestion,
  addIngestion,
  updateIngestion,
  paging,
  pagingHandler,
  currrentPage,
}: IngestionProps) => {
  const { isAdminUser } = useAuth();
  const { isAuthDisabled } = useAuthContext();
  const [searchText, setSearchText] = useState('');
  const [activeIngestionStep, setActiveIngestionStep] = useState(1);
  const [currTriggerId, setCurrTriggerId] = useState({ id: '', state: '' });
  const [showIngestionForm, setShowIngestionForm] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState({
    id: '',
    name: '',
    state: '',
  });
  const [updateSelection, setUpdateSelection] = useState<IngestionPipeline>();
  const noConnectionMsg = `${serviceName} doesn't have connection details filled in. Please add the details before scheduling an ingestion job.`;

  const handleSearchAction = (searchValue: string) => {
    setSearchText(searchValue);
  };

  const getIngestionPipelineTypeOption = (): PipelineType[] => {
    if (ingestionList.length > 0) {
      const ingestion = ingestionList[0]?.source?.serviceConnection
        ?.config as ModifiedConfig;
      const pipelineType = [];
      ingestion?.supportsMetadataExtraction &&
        pipelineType.push(PipelineType.Metadata);
      ingestion?.supportsUsageExtraction &&
        pipelineType.push(PipelineType.Usage);

      return pipelineType.reduce((prev, curr) => {
        if (ingestionList.find((d) => d.pipelineType === curr)) {
          return prev;
        } else {
          return [...prev, curr];
        }
      }, [] as PipelineType[]);
    }

    return [PipelineType.Metadata, PipelineType.Usage];
  };

  const handleTriggerIngestion = (id: string, displayName: string) => {
    setCurrTriggerId({ id, state: 'waiting' });
    triggerIngestion(id, displayName)
      .then(() => {
        setCurrTriggerId({ id, state: 'success' });
        setTimeout(() => setCurrTriggerId({ id: '', state: '' }), 1500);
      })
      .catch(() => setCurrTriggerId({ id: '', state: '' }));
  };

  const handleCancelConfirmationModal = () => {
    setIsConfirmationModalOpen(false);
    setDeleteSelection({
      id: '',
      name: '',
      state: '',
    });
  };

  const handleUpdate = (ingestion: IngestionPipeline) => {
    setUpdateSelection(ingestion);
    setShowIngestionForm(true);
  };

  const handleCancelUpdate = () => {
    setUpdateSelection(undefined);
    setShowIngestionForm(false);
  };

  const handleDelete = (id: string, displayName: string) => {
    setDeleteSelection({ id, name: displayName, state: 'waiting' });
    deleteIngestion(id, displayName)
      .then(() => {
        setTimeout(() => {
          setDeleteSelection({ id, name: displayName, state: 'success' });
          handleCancelConfirmationModal();
        }, 500);
      })
      .catch(() => {
        handleCancelConfirmationModal();
      });
  };

  const ConfirmDelete = (id: string, name: string) => {
    setDeleteSelection({
      id,
      name,
      state: '',
    });
    setIsConfirmationModalOpen(true);
  };

  const handleAddIngestionClick = () => {
    if (!getIngestionPipelineTypeOption().length) {
      showInfoToast(
        `${serviceName} already has all the supported ingestion jobs added.`
      );
    } else {
      setShowIngestionForm(true);
    }
  };

  const getSearchedIngestions = useCallback(() => {
    const sText = lowerCase(searchText);

    return sText
      ? ingestionList.filter(
          (ing) =>
            lowerCase(ing.displayName).includes(sText) ||
            lowerCase(ing.name).includes(sText)
        )
      : ingestionList;
  }, [searchText, ingestionList]);

  const getStatuses = (ingestion: IngestionPipeline) => {
    const lastFiveIngestions = ingestion.pipelineStatuses
      ?.sort((a, b) => {
        // Turn your strings into millis, and then subtract them
        // to get a value that is either negative, positive, or zero.
        const date1 = new Date(a.startDate || '');
        const date2 = new Date(b.startDate || '');

        return date1.getTime() - date2.getTime();
      })
      .slice(Math.max(ingestion.pipelineStatuses.length - 5, 0));

    return lastFiveIngestions?.map((r, i) => {
      return (
        <PopOver
          html={
            <div className="tw-text-left">
              {r.startDate ? (
                <p>Start Date: {new Date(r.startDate).toUTCString()}</p>
              ) : null}
              {r.endDate ? (
                <p>End Date: {new Date(r.endDate).toUTCString()}</p>
              ) : null}
            </div>
          }
          key={i}
          position="bottom"
          theme="light"
          trigger="mouseenter">
          {i === lastFiveIngestions.length - 1 ? (
            <p
              className={`tw-h-5 tw-w-16 tw-rounded-sm tw-bg-status-${r.state} tw-mr-1 tw-px-1 tw-text-white tw-text-center`}>
              {capitalize(r.state)}
            </p>
          ) : (
            <p
              className={`tw-w-4 tw-h-5 tw-rounded-sm tw-bg-status-${r.state} tw-mr-1`}
            />
          )}
        </PopOver>
      );
    });
  };

  const getIngestionTab = () => {
    return (
      <div
        className="tw-px-4 tw-mt-4"
        data-testid="ingestion-details-container">
        <div className="tw-flex">
          {!isRequiredDetailsAvailable && (
            <div className="tw-rounded tw-bg-error-lite tw-text-error tw-font-medium tw-px-4 tw-py-1 tw-mb-4 tw-flex tw-items-center tw-gap-1">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <p> {noConnectionMsg} </p>
            </div>
          )}
        </div>
        <div className="tw-flex">
          <div className="tw-w-4/12">
            {searchText || getSearchedIngestions().length > 0 ? (
              <Searchbar
                placeholder="Search for ingestion..."
                searchValue={searchText}
                typingInterval={500}
                onSearch={handleSearchAction}
              />
            ) : null}
          </div>
          <div className="tw-w-8/12 tw-flex tw-justify-end">
            {isRequiredDetailsAvailable && (
              <NonAdminAction
                position="bottom"
                title={TITLE_FOR_NON_ADMIN_ACTION}>
                <Button
                  className={classNames('tw-h-8 tw-rounded tw-mb-2')}
                  data-testid="add-new-ingestion-button"
                  disabled={
                    getIngestionPipelineTypeOption().length === 0 ||
                    (!isAdminUser && !isAuthDisabled)
                  }
                  size="small"
                  theme="primary"
                  variant="contained"
                  onClick={handleAddIngestionClick}>
                  Add Ingestion
                </Button>
              </NonAdminAction>
            )}
          </div>
        </div>
        {getSearchedIngestions().length ? (
          <div className="tw-table-responsive tw-mb-6">
            <table
              className="tw-bg-white tw-w-full tw-mb-4"
              data-testid="ingestion-table">
              <thead>
                <tr className="tableHead-row" data-testid="table-header">
                  <th className="tableHead-cell">Name</th>
                  <th className="tableHead-cell">Type</th>
                  <th className="tableHead-cell">Schedule</th>
                  <th className="tableHead-cell">Recent Runs</th>
                  <th className="tableHead-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="tableBody">
                {getSearchedIngestions().map((ingestion, index) => (
                  <tr
                    className={classNames(
                      'tableBody-row',
                      !isEven(index + 1) ? 'odd-row' : null
                    )}
                    key={index}>
                    <td className="tableBody-cell">{ingestion.name}</td>
                    <td className="tableBody-cell">{ingestion.pipelineType}</td>
                    <td className="tableBody-cell">
                      {ingestion.airflowConfig?.scheduleInterval ? (
                        <PopOver
                          html={
                            <div>
                              {cronstrue.toString(
                                ingestion.airflowConfig.scheduleInterval || '',
                                {
                                  use24HourTimeFormat: true,
                                  verbose: true,
                                }
                              )}
                            </div>
                          }
                          position="bottom"
                          theme="light"
                          trigger="mouseenter">
                          <span>
                            {ingestion.airflowConfig.scheduleInterval ?? '--'}
                          </span>
                        </PopOver>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                    <td className="tableBody-cell">
                      <div className="tw-flex">{getStatuses(ingestion)}</div>
                    </td>

                    <td className="tableBody-cell">
                      <NonAdminAction
                        position="bottom"
                        title={TITLE_FOR_NON_ADMIN_ACTION}>
                        <div className="tw-flex">
                          <button
                            className="link-text tw-mr-2"
                            data-testid="run"
                            onClick={() =>
                              handleTriggerIngestion(
                                ingestion.id as string,
                                ingestion.name
                              )
                            }>
                            {currTriggerId.id === ingestion.id ? (
                              currTriggerId.state === 'success' ? (
                                <FontAwesomeIcon icon="check" />
                              ) : (
                                <Loader size="small" type="default" />
                              )
                            ) : (
                              'Run'
                            )}
                          </button>
                          <button
                            className="link-text tw-mr-2"
                            data-testid="edit"
                            disabled={!isRequiredDetailsAvailable}
                            onClick={() => handleUpdate(ingestion)}>
                            Edit
                          </button>
                          <button
                            className="link-text tw-mr-2"
                            data-testid="delete"
                            onClick={() =>
                              ConfirmDelete(
                                ingestion.id as string,
                                ingestion.name
                              )
                            }>
                            {deleteSelection.id === ingestion.id ? (
                              deleteSelection.state === 'success' ? (
                                <FontAwesomeIcon icon="check" />
                              ) : (
                                <Loader size="small" type="default" />
                              )
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </NonAdminAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Boolean(!isNil(paging.after) || !isNil(paging.before)) && (
              <NextPrevious
                currentPage={currrentPage}
                pageSize={PAGE_SIZE}
                paging={paging}
                pagingHandler={pagingHandler}
                totalCount={paging.total}
              />
            )}
          </div>
        ) : (
          <div className="tw-flex tw-items-center tw-flex-col">
            {isRequiredDetailsAvailable && ingestionList.length === 0 && (
              <div className="tw-mt-24">
                <p className="tw-text-lg tw-text-center">
                  {`No ingestion workflows found ${
                    searchText ? `for "${searchText}"` : ''
                  }`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getIngestionForm = () => {
    const type = getIngestionPipelineTypeOption();
    let heading = '';

    if (isUndefined(updateSelection)) {
      heading = `Add ${capitalize(type[0])} Ingestion`;
    } else {
      heading = `Edit ${capitalize(updateSelection.pipelineType)} Ingestion`;
    }

    return (
      <div className="tw-bg-white tw-pt-4 tw-w-full">
        <div className="tw-max-w-2xl tw-mx-auto tw-pb-6">
          <AddIngestion
            activeIngestionStep={activeIngestionStep}
            data={updateSelection}
            handleCancelClick={handleCancelUpdate}
            heading={heading}
            pipelineType={type[0]}
            serviceCategory={serviceCategory}
            serviceData={serviceDetails}
            setActiveIngestionStep={(step) => setActiveIngestionStep(step)}
            showSuccessScreen={false}
            status={
              isUndefined(updateSelection)
                ? FormSubmitType.ADD
                : FormSubmitType.EDIT
            }
            onAddIngestionSave={addIngestion}
            onSuccessSave={handleCancelUpdate}
            onUpdateIngestion={updateIngestion}
          />
        </div>
      </div>
    );
  };

  return (
    <div data-testid="ingestion-container">
      {showIngestionForm ? getIngestionForm() : getIngestionTab()}

      {isConfirmationModalOpen && (
        <EntityDeleteModal
          entityName={deleteSelection.name}
          entityType="ingestion"
          loadingState={deleteSelection.state}
          onCancel={handleCancelConfirmationModal}
          onConfirm={() =>
            handleDelete(deleteSelection.id, deleteSelection.name)
          }
        />
      )}
    </div>
  );
};

export default Ingestion;
