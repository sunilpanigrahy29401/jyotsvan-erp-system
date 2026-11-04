// src/app/pages/PeoplePage.tsx
// Phase 21 — Enterprise HRMS, Indian Statutory Payroll & People Management Main Router

import { PeopleDashboard } from './people/PeopleDashboard.tsx';
import { EmployeeDirectory } from './people/EmployeeDirectory.tsx';
import { AttendanceManagement } from './people/AttendanceManagement.tsx';
import { LeaveManagement } from './people/LeaveManagement.tsx';
import { WorkforceTasks } from './people/WorkforceTasks.tsx';
import { PerformanceScorecards } from './people/PerformanceScorecards.tsx';
import { PayrollManagement } from './people/PayrollManagement.tsx';
import { ShiftsAndHolidays } from './people/ShiftsAndHolidays.tsx';
import { EmployeeSelfService } from './people/EmployeeSelfService.tsx';
import { HRWorkflowCenter } from './people/HRWorkflowCenter.tsx';

export interface PeoplePageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function PeoplePage({ currentPath = '/people', onNavigate }: PeoplePageProps) {
  const cleanPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/people';

  if (cleanPath === '/people/employees') {
    return <EmployeeDirectory />;
  }

  if (cleanPath === '/people/attendance') {
    return <AttendanceManagement />;
  }

  if (cleanPath === '/people/leave') {
    return <LeaveManagement />;
  }

  if (cleanPath === '/people/tasks') {
    return <WorkforceTasks />;
  }

  if (cleanPath === '/people/performance') {
    return <PerformanceScorecards />;
  }

  if (cleanPath === '/people/payroll') {
    return <PayrollManagement />;
  }

  if (cleanPath === '/people/shifts' || cleanPath === '/people/holidays') {
    return <ShiftsAndHolidays />;
  }

  if (cleanPath === '/people/ess' || cleanPath === '/people/portal') {
    return <EmployeeSelfService />;
  }

  if (cleanPath === '/people/requests' || cleanPath === '/people/exits' || cleanPath === '/people/workflows') {
    return <HRWorkflowCenter />;
  }

  // Default route: /people and /people/overview Command Center
  return <PeopleDashboard onNavigate={onNavigate} />;
}
