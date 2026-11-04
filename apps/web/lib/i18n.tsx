"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar" | "en";

interface I18nContextType {
  lang: Language;
  isAr: boolean;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Top Bar
    "app.name": "PR AI WORKFORCE",
    "app.subtitle": "نظام تشغيل القوى العاملة الذكية",
    "nav.org": "PR Agency Internal",
    "nav.logout": "تسجيل خروج",
    "role.owner": "مالك (Owner)",
    "role.member": "عضو (Member)",
    
    // Sidebar 13 items
    "nav.command_center": "مركز القيادة",
    "nav.virtual_office": "المكتب الافتراضي",
    "nav.agents": "وكلاء الذكاء الاصطناعي",
    "nav.departments": "الأقسام",
    "nav.tasks": "المهام",
    "nav.workflows": "منشئ مسارات العمل",
    "nav.projects": "المشاريع",
    "nav.clients": "العملاء",
    "nav.memory": "الذاكرة المعرفية",
    "nav.deliverables": "المخرجات",
    "nav.analytics": "التحليلات",
    "nav.integrations": "التكاملات",
    "nav.settings": "الإعدادات",
    "badge.coming_soon": "قريباً",

    // Dashboard
    "dash.welcome": "مرحباً بك في مركز قيادة PR AI WORKFORCE",
    "dash.welcome_sub": "النظام المركزي لإدارة 38 موظف ذكاء اصطناعي ومنسق الإدارة التنفيذية أم سماح.",
    "dash.total_clients": "إجمالي العملاء",
    "dash.active_projects": "المشاريع النشطة",
    "dash.total_retainer": "إجمالي عوائد العقود (Retainer)",
    "dash.total_projects": "إجمالي المشاريع",
    "dash.empty_cta_title": "ابدأ بإضافة أول عميل",
    "dash.empty_cta_desc": "لم يتم تسجيل أي عملاء بعد في النظام. أضف عميلك الأول لربط المشاريع وتكليف وكلاء الذكاء الاصطناعي.",
    "dash.add_client": "إضافة عميل جديد",
    "dash.add_project": "إضافة مشروع جديد",
    "dash.recent_clients": "أحدث العملاء",
    "dash.recent_projects": "أحدث المشاريع",
    "dash.view_all": "عرض الكل",
    "dash.no_recent": "لا توجد سجلات حالياً",

    // Clients
    "clients.title": "إدارة العملاء",
    "clients.subtitle": "سجل عملاء الوكالة، الصناعات، الهوية والمسؤولين",
    "clients.search": "بحث بالاسم أو الصناعة أو جهة الاتصال...",
    "clients.new_button": "عميل جديد",
    "clients.col_client": "العميل",
    "clients.col_industry": "الصناعة",
    "clients.col_contact": "جهة الاتصال",
    "clients.col_assigned": "المسؤول المكلّف",
    "clients.col_actions": "الإجراءات",
    "clients.view": "تفاصيل",
    "clients.delete": "حذف",
    "clients.delete_confirm": "هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع المشاريع التابعة له.",
    "clients.empty": "لا يوجد عملاء يطابقون البحث",
    "clients.empty_create": "لا يوجد عملاء حتى الآن. ابدأ بإضافة أول عميل!",

    // Client Form Modal
    "client_modal.title_new": "إضافة عميل جديد",
    "client_modal.title_edit": "تعديل بيانات العميل",
    "client_modal.name": "اسم العميل / المؤسسة",
    "client_modal.industry": "مجال العمل / الصناعة",
    "client_modal.brand_color": "لون العلامة التجارية",
    "client_modal.contact_name": "اسم جهة الاتصال",
    "client_modal.contact_email": "البريد الإلكتروني",
    "client_modal.contact_phone": "رقم الهاتف",
    "client_modal.assigned_to": "تعيين لعضو الفريق",
    "client_modal.unassigned": "غير مخصص (المالك فقط)",
    "client_modal.save": "حفظ العميل",
    "client_modal.cancel": "إلغاء",
    "client_modal.saving": "جارٍ الحفظ...",

    // Client Detail
    "client_detail.back": "العودة للعملاء",
    "client_detail.overview": "نظرة عامة",
    "client_detail.linked_projects": "المشاريع المرتبطة بهذا العميل",
    "client_detail.no_projects": "لا توجد مشاريع مسجلة لهذا العميل حتى الآن.",

    // Projects
    "projects.title": "إدارة المشاريع",
    "projects.subtitle": "تتبع مشاريع العملاء، الميزانيات، العقود الشهرية والحالات",
    "projects.new_button": "مشروع جديد",
    "projects.filter_client": "تصفية حسب العميل:",
    "projects.all_clients": "جميع العملاء",
    "projects.filter_status": "الحالة:",
    "projects.all_statuses": "جميع الحالات",
    "projects.status_active": "نشط (Active)",
    "projects.status_paused": "متوقف مؤقتاً (Paused)",
    "projects.status_completed": "مكتمل (Completed)",
    "projects.col_project": "المشروع",
    "projects.col_client": "العميل",
    "projects.col_status": "الحالة",
    "projects.col_retainer": "عائد العقد (Retainer)",
    "projects.col_dates": "الفترة الزمنية",
    "projects.col_actions": "الإجراءات",
    "projects.view": "تفاصيل",
    "projects.delete": "حذف",
    "projects.delete_confirm": "هل أنت متأكد من حذف هذا المشروع؟",
    "projects.empty": "لا توجد مشاريع تطابق المعايير المحددة",
    "projects.empty_create": "لا توجد مشاريع مسجلة بعد. أضف أول مشروع!",

    // Project Form Modal
    "project_modal.title_new": "إضافة مشروع جديد",
    "project_modal.title_edit": "تعديل المشروع",
    "project_modal.client": "العميل المالك للمشروع",
    "project_modal.select_client": "اختر العميل...",
    "project_modal.name": "اسم المشروع",
    "project_modal.description": "وصف المشروع والأهداف",
    "project_modal.status": "حالة المشروع",
    "project_modal.retainer": "قيمة العقد الشهري ($ Retainer)",
    "project_modal.start_date": "تاريخ البدء",
    "project_modal.end_date": "تاريخ الانتهاء",
    "project_modal.assigned_to": "المسؤول المكلّف",
    "project_modal.save": "حفظ المشروع",
    "project_modal.cancel": "إلغاء",
    "project_modal.saving": "جارٍ الحفظ...",

    // Project Detail
    "project_detail.back": "العودة للمشاريع",
    "project_detail.overview": "بيانات المشروع والعقد",
    "project_detail.retainer_badge": "عقد شهري",
    "project_detail.linked_tasks": "مهام الذكاء الاصطناعي (Tasks & Workflows)",
    "project_detail.tasks_placeholder": "سيتم ربط مهام الوكلاء الـ 38 ومخرجات سير العمل في المراحل القادمة (M3 & M4).",
    // Tasks (Milestone 3)
    "tasks.title": "إدارة المهام ومسار العمل",
    "tasks.subtitle": "متابعة مسارات التنفيذ، التكليف، ومزامنة إنجاز المشاريع الحية (Live WebSocket)",
    "tasks.view_kanban": "لوحة كانبان (Kanban)",
    "tasks.view_table": "عرض الجدول (Table)",
    "tasks.new_button": "مهمة جديدة",
    "tasks.filter_project": "تصفية حسب المشروع:",
    "tasks.all_projects": "جميع المشاريع",
    "tasks.filter_priority": "الأولوية:",
    "tasks.all_priorities": "جميع الأولويات",
    "tasks.col_pending": "قيد الانتظار والتخطيط",
    "tasks.col_assigned": "تم التعيين",
    "tasks.col_in_progress": "قيد التنفيذ",
    "tasks.col_review": "المراجعة والاعتماد",
    "tasks.col_completed": "مكتملة",
    "tasks.live_sync": "مزامنة فورية (Live WebSocket)",
    "tasks.empty": "لا توجد مهام تطابق المعايير",
    "tasks.empty_create": "لا توجد مهام حالياً. ابدأ بإضافة أول مهمة!",
    "tasks.drag_hint": "اسحب البطاقة لتغيير حالتها ونسبة إنجازها فوراً",
    "tasks.delete_confirm": "هل أنت متأكد من حذف هذه المهمة؟",

    // Task Modal
    "task_modal.title_new": "إنشاء مهمة جديدة",
    "task_modal.title_detail": "تفاصيل المهمة وسجل العمليات",
    "task_modal.project": "المشروع التابع له",
    "task_modal.select_project": "اختر المشروع...",
    "task_modal.title": "عنوان المهمة",
    "task_modal.description": "التفاصيل والتعليمات",
    "task_modal.status": "الحالة",
    "task_modal.priority": "الأولوية",
    "task_modal.priority_low": "منخفضة (Low)",
    "task_modal.priority_medium": "متوسطة (Medium)",
    "task_modal.priority_high": "عالية (High)",
    "task_modal.priority_urgent": "عاجلة ⚡ (Urgent)",
    "task_modal.assigned_to": "المسؤول المكلّف",
    "task_modal.unassigned": "غير مخصص (المالك)",
    "task_modal.due_date": "تاريخ الاستحقاق",
    "task_modal.dependencies": "المتطلبات السابقة (Dependencies)",
    "task_modal.timeline": "سجل الأحداث والتدقيق (Event Timeline)",
    "task_modal.progress": "نسبة إنجاز المهمة",
    "task_modal.save": "حفظ المهمة",
    "task_modal.cancel": "إلغاء",
    "task_modal.saving": "جارٍ الحفظ...",
  },
  en: {
    // Top Bar
    "app.name": "PR AI WORKFORCE",
    "app.subtitle": "Intelligent Workforce Operating System",
    "nav.org": "PR Agency Internal",
    "nav.logout": "Logout",
    "role.owner": "Owner",
    "role.member": "Member",

    // Sidebar 13 items
    "nav.command_center": "Command Center",
    "nav.virtual_office": "Virtual Office",
    "nav.agents": "Agents",
    "nav.departments": "Departments",
    "nav.tasks": "Tasks",
    "nav.workflows": "Workflow Builder",
    "nav.projects": "Projects",
    "nav.clients": "Clients",
    "nav.memory": "Memory",
    "nav.deliverables": "Deliverables",
    "nav.analytics": "Analytics",
    "nav.integrations": "Integrations",
    "nav.settings": "Settings",
    "badge.coming_soon": "Soon",

    // Dashboard
    "dash.welcome": "Welcome to PR AI WORKFORCE Command Center",
    "dash.welcome_sub": "Central operating system coordinating 38 specialized AI employees and CEO Orchestrator Om Samah.",
    "dash.total_clients": "Total Clients",
    "dash.active_projects": "Active Projects",
    "dash.total_retainer": "Total Retainer Revenue",
    "dash.total_projects": "Total Projects",
    "dash.empty_cta_title": "Add your first client",
    "dash.empty_cta_desc": "No clients recorded yet in the database. Add your first client to link projects and delegate work to AI agents.",
    "dash.add_client": "Add New Client",
    "dash.add_project": "Add New Project",
    "dash.recent_clients": "Recent Clients",
    "dash.recent_projects": "Recent Projects",
    "dash.view_all": "View All",
    "dash.no_recent": "No records found",

    // Clients
    "clients.title": "Clients Management",
    "clients.subtitle": "Agency client roster, industries, brand identities and assignees",
    "clients.search": "Search by name, industry, or contact...",
    "clients.new_button": "New Client",
    "clients.col_client": "Client",
    "clients.col_industry": "Industry",
    "clients.col_contact": "Contact Person",
    "clients.col_assigned": "Assignee",
    "clients.col_actions": "Actions",
    "clients.view": "View",
    "clients.delete": "Delete",
    "clients.delete_confirm": "Are you sure you want to delete this client? All linked projects will also be deleted.",
    "clients.empty": "No clients match your search",
    "clients.empty_create": "No clients yet. Add your first client!",

    // Client Form Modal
    "client_modal.title_new": "Add New Client",
    "client_modal.title_edit": "Edit Client Details",
    "client_modal.name": "Client / Company Name",
    "client_modal.industry": "Industry / Sector",
    "client_modal.brand_color": "Brand Color",
    "client_modal.contact_name": "Contact Name",
    "client_modal.contact_email": "Contact Email",
    "client_modal.contact_phone": "Contact Phone",
    "client_modal.assigned_to": "Assign to Team Member",
    "client_modal.unassigned": "Unassigned (Owner only)",
    "client_modal.save": "Save Client",
    "client_modal.cancel": "Cancel",
    "client_modal.saving": "Saving...",

    // Client Detail
    "client_detail.back": "Back to Clients",
    "client_detail.overview": "Overview",
    "client_detail.linked_projects": "Projects Linked to this Client",
    "client_detail.no_projects": "No projects recorded for this client yet.",

    // Projects
    "projects.title": "Projects Management",
    "projects.subtitle": "Track client engagements, retainer budgets, status and timelines",
    "projects.new_button": "New Project",
    "projects.filter_client": "Filter by Client:",
    "projects.all_clients": "All Clients",
    "projects.filter_status": "Status:",
    "projects.all_statuses": "All Statuses",
    "projects.status_active": "Active",
    "projects.status_paused": "Paused",
    "projects.status_completed": "Completed",
    "projects.col_project": "Project",
    "projects.col_client": "Client",
    "projects.col_status": "Status",
    "projects.col_retainer": "Monthly Retainer",
    "projects.col_dates": "Timeline",
    "projects.col_actions": "Actions",
    "projects.view": "View",
    "projects.delete": "Delete",
    "projects.delete_confirm": "Are you sure you want to delete this project?",
    "projects.empty": "No projects match the selected criteria",
    "projects.empty_create": "No projects yet. Create your first project!",

    // Project Form Modal
    "project_modal.title_new": "Add New Project",
    "project_modal.title_edit": "Edit Project",
    "project_modal.client": "Client Owner",
    "project_modal.select_client": "Select client...",
    "project_modal.name": "Project Name",
    "project_modal.description": "Description & Deliverable Scope",
    "project_modal.status": "Project Status",
    "project_modal.retainer": "Monthly Retainer ($)",
    "project_modal.start_date": "Start Date",
    "project_modal.end_date": "End Date",
    "project_modal.assigned_to": "Assignee",
    "project_modal.save": "Save Project",
    "project_modal.cancel": "Cancel",
    "project_modal.saving": "Saving...",

    // Project Detail
    "project_detail.back": "Back to Projects",
    "project_detail.overview": "Project & Retainer Overview",
    "project_detail.retainer_badge": "Monthly Retainer",
    "project_detail.linked_tasks": "AI Tasks & Workflows",
    "project_detail.tasks_placeholder": "38 Specialized AI agents and automated workflow pipelines will be linked here in M3 & M4.",

    // Tasks (Milestone 3)
    "tasks.title": "Tasks & Execution Engine",
    "tasks.subtitle": "Track work streams, assignments, and real-time project progress synchronization (Live WebSocket)",
    "tasks.view_kanban": "Kanban Board",
    "tasks.view_table": "Table View",
    "tasks.new_button": "New Task",
    "tasks.filter_project": "Filter by Project:",
    "tasks.all_projects": "All Projects",
    "tasks.filter_priority": "Priority:",
    "tasks.all_priorities": "All Priorities",
    "tasks.col_pending": "Pending & Planning",
    "tasks.col_assigned": "Assigned",
    "tasks.col_in_progress": "In Progress",
    "tasks.col_review": "Review & Approval",
    "tasks.col_completed": "Completed",
    "tasks.live_sync": "Live WebSocket Sync",
    "tasks.empty": "No tasks match the filter",
    "tasks.empty_create": "No tasks yet. Create your first task!",
    "tasks.drag_hint": "Drag card to change its status & progress automatically",
    "tasks.delete_confirm": "Are you sure you want to delete this task?",

    // Task Modal
    "task_modal.title_new": "Create New Task",
    "task_modal.title_detail": "Task Details & Audit Timeline",
    "task_modal.project": "Associated Project",
    "task_modal.select_project": "Select project...",
    "task_modal.title": "Task Title",
    "task_modal.description": "Description & Instructions",
    "task_modal.status": "Status",
    "task_modal.priority": "Priority",
    "task_modal.priority_low": "Low",
    "task_modal.priority_medium": "Medium",
    "task_modal.priority_high": "High",
    "task_modal.priority_urgent": "Urgent ⚡",
    "task_modal.assigned_to": "Assignee",
    "task_modal.unassigned": "Unassigned (Owner only)",
    "task_modal.due_date": "Due Date",
    "task_modal.dependencies": "Dependencies",
    "task_modal.timeline": "Event Timeline & Audit Trail",
    "task_modal.progress": "Task Progress",
    "task_modal.save": "Save Task",
    "task_modal.cancel": "Cancel",
    "task_modal.saving": "Saving...",
  }
};

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  isAr: true,
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("pr_lang") as Language;
    if (saved && (saved === "ar" || saved === "en")) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("pr_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  const toggleLang = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  const isAr = lang === "ar";

  return (
    <I18nContext.Provider value={{ lang, isAr, setLang, toggleLang, t }}>
      <div dir={isAr ? "rtl" : "ltr"} className={isAr ? "font-cairo" : "font-inter"}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
