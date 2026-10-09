import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { MaintenanceRequestProvider } from './contexts/MaintenanceRequestContext/MaintenanceRequestContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import EquipmentProvider from './contexts/EquipmentContext/EquipmentContext.jsx'
import { LaboratoryProvider } from './contexts/LaboratoryContext/LaboratoryContext.jsx'
import { FilterSpecificAssignProvider } from './contexts/FilterSpecificAssignContext/FilterSpecificAssignContext.jsx'
import { UserProvider } from "./contexts/UserContext/UserContext.jsx"
import { AssignLabProvider } from './contexts/AssignLabContext/AssignLabContext.jsx'
import { AssignProvider } from './contexts/DisplayAssignContext/DisplayAssignContext.jsx'
import { TypeofMaintenanceProvider } from './contexts/TypesofMainten/TypeofMaintenanceContext.jsx'
import { DepartmentDisplayProvider } from './contexts/DepartmentContext/DepartmentContext.jsx'
import { IncomingDisplayProvider } from './contexts/ProcessIncomingRequest/IncomingRequestContext.jsx'
import { StatisticsProvider } from './contexts/StatisticContext/statisticalContext.jsx'
import SocketListener from './SocketListener.jsx'
import { PMSProvider } from './contexts/PMS/pmsContext.jsx'
import PMS002Provider from './contexts/PMS/pmsContext002.jsx'
import PMS003Provider from './contexts/PMS/pmsContext003.jsx'
import PMS006Provider from './contexts/PMS/pmsContext006.jsx'
import {
  DeleteAssignProvider,
  LaboratorytProvider
} from './contexts/CountContext/CountContext.jsx'

import { AddAssignProvider } from './contexts/AssignContext/AddAssignContext.jsx'

import { MessagePostProvider } from './contexts/MessageContext/POSTmessage.jsx'

import { ProblemProvider } from './contexts/ProblemContext/ProblemContext.jsx'

import { HistoryProvider } from './contexts/HistoryContext/HistoryContext.jsx'

import { MaintenanceRecordProvider } from './contexts/PMSMaintenanceRecord/PMSMaintenanceRecord.jsx'
import PMS004Provider from './contexts/PMS/pmsContext004.jsx'
import PMS005Provider from './contexts/PMS/pmsContext005.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PMS006Provider>
        <PMS005Provider>
          <PMS004Provider>
            <PMS003Provider>
              <PMS002Provider>
                <PMSProvider>
                  <MaintenanceRecordProvider>
                    <HistoryProvider>
                      <ProblemProvider>
                        <StatisticsProvider>
                          <MessagePostProvider>
                            <MaintenanceRequestProvider>
                              <IncomingDisplayProvider>
                                <DepartmentDisplayProvider>
                                  <TypeofMaintenanceProvider>
                                    <AssignProvider>
                                      <UserProvider>
                                        <FilterSpecificAssignProvider>
                                          <LaboratorytProvider>
                                            <LaboratoryProvider>
                                              {/*  Wrap EquipmentProvider with EquipmentDataProvider */}
                                              <EquipmentProvider>
                                                <EquipmentProvider>
                                                  <AddAssignProvider>
                                                    <DeleteAssignProvider>
                                                      <AssignLabProvider>
                                                        <App />
                                                        <SocketListener />
                                                      </AssignLabProvider>
                                                    </DeleteAssignProvider>
                                                  </AddAssignProvider>
                                                </EquipmentProvider>
                                              </EquipmentProvider>
                                            </LaboratoryProvider>
                                          </LaboratorytProvider>
                                        </FilterSpecificAssignProvider>
                                      </UserProvider>
                                    </AssignProvider>
                                  </TypeofMaintenanceProvider>
                                </DepartmentDisplayProvider>
                              </IncomingDisplayProvider>
                            </MaintenanceRequestProvider>
                          </MessagePostProvider>
                        </StatisticsProvider>
                      </ProblemProvider>
                    </HistoryProvider>
                  </MaintenanceRecordProvider>
                </PMSProvider>
              </PMS002Provider>
            </PMS003Provider>
          </PMS004Provider>
        </PMS005Provider>
      </PMS006Provider>
    </AuthProvider>
  </StrictMode>,
)