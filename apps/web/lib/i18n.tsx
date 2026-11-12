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

    // Sidebar 14 items
    "nav.command_center": "مركز القيادة",
    "nav.studio": "استوديو الإنتاج",
    "nav.virtual_office": "المكتب الافتراضي",
    "nav.agents": "وكلاء الذكاء الاصطناعي",
    "nav.departments": "الأقسام",
    "nav.tasks": "المهام",
    "nav.workflows": "منشئ مسارات العمل",
    "nav.approvals": "الموافقات",
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
    "dash.welcome_sub":
      "النظام المركزي لإدارة 38 موظف ذكاء اصطناعي ومنسق الإدارة التنفيذية أم سماح.",
    "dash.total_clients": "إجمالي العملاء",
    "dash.active_projects": "المشاريع النشطة",
    "dash.total_retainer": "إجمالي عوائد العقود (Retainer)",
    "dash.total_projects": "إجمالي المشاريع",
    "dash.empty_cta_title": "ابدأ بإضافة أول عميل",
    "dash.empty_cta_desc":
      "لم يتم تسجيل أي عملاء بعد في النظام. أضف عميلك الأول لربط المشاريع وتكليف وكلاء الذكاء الاصطناعي.",
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
    "clients.delete_confirm":
      "هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع المشاريع التابعة له.",
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
    "projects.subtitle":
      "تتبع مشاريع العملاء، الميزانيات، العقود الشهرية والحالات",
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
    "project_detail.tasks_placeholder":
      "سيتم ربط مهام الوكلاء الـ 38 ومخرجات سير العمل في المراحل القادمة (M3 & M4).",
    // Tasks (Milestone 3)
    "tasks.title": "إدارة المهام ومسار العمل",
    "tasks.subtitle":
      "متابعة مسارات التنفيذ، التكليف، ومزامنة إنجاز المشاريع الحية (Live WebSocket)",
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

    // Agents (Milestone 8 - Full 38 Roster)
    "agents.title": "دليل الموظفين الأذكياء (AI Agents)",
    "agents.subtitle":
      "إدارة وتكليف الوكلاء الـ 38 المتخصصين عبر الأقسام الـ 8 في الوكالة",
    "agents.all_departments": "جميع الأقسام",
    "agents.search_placeholder": "ابحث بالاسم، الدور، القسم أو الأدوات...",
    "agents.no_results": "لا يوجد وكلاء يطابقون معايير البحث",
    "agents.active_roster": "وكيل نشط وجاهز للعمل",
    "agents.status_ready": "جاهز للتكليف",
    "agents.status_active": "نشط وقيد العمل",
    "agents.run_button": "تشغيل وتكليف الوكيل",
    "agents.console_title": "وحدة تشغيل وتكليف الوكيل (Execution Console)",
    "agents.select_project": "ربط بمشروع محدد",
    "agents.select_project_placeholder": "اختر مشروعاً...",
    "agents.input_brief": "بيانات التكليف ومدخلات المهمة (JSON Input)",
    "agents.load_sample": "تحميل نموذج تكليف جاهز",
    "agents.running": "جارٍ التنفيذ بواسطة الذكاء الاصطناعي...",
    "agents.execute_now": "بدء التنفيذ الفوري ⚡",
    "agents.output_title": "مخرجات المهمة المعتمدة (Structured Deliverable)",
    "agents.quality_score": "درجة الجودة والامتثال",
    "agents.view_deliverables": "عرض في جدول المخرجات",
    "agents.download_json": "تحميل ملف JSON",
    "agents.tools_count": "أدوات متصلة",
    "agents.criteria_title": "معايير الجودة الصارمة (Quality Criteria)",
    "agents.system_prompt": "التعليمات التأسيسية (System Prompt)",

    // Virtual Office (Milestone 9)
    "virtual_office.title": "المكتب الافتراضي التفاعلي (Virtual Office)",
    "virtual_office.subtitle":
      "متابعة حية لجميع الموظفين الأذكياء الـ 38 موزعين على أقسام الوكالة الـ 8 مع تحديثات لحظية للحالة",
    "virtual_office.status_all": "جميع الحالات",
    "virtual_office.status_idle": "متاح / خامل",
    "virtual_office.status_working": "قيد التنفيذ ⚡",
    "virtual_office.status_blocked": "يتطلب موافقة ⚠️",
    "virtual_office.live_sync": "مزامنة لحظية مباشرة (Live WebSocket)",
    "virtual_office.drawer_title": "ملف الوكيل ومحطة التحكم",
    "virtual_office.execute_cta": "تشغيل وتكليف الوكيل ⚡",
    "virtual_office.view_tasks": "عرض المهام في لوحة المهام",
    "virtual_office.simulate_status": "محاكاة وتغيير الحالة:",
    "virtual_office.current_task": "المهمة الجارية حالياً:",
    "virtual_office.recent_deliverables": "أحدث المخرجات المعتمدة",
    "virtual_office.no_deliverables":
      "لا توجد مخرجات مسجلة لهذا الوكيل حتى الآن",
    "virtual_office.search_placeholder":
      "ابحث بالاسم، الدور، أو القسم في المكتب الافتراضي...",
    "virtual_office.department_zones": "غرف وأقسام الوكالة",

    // Deliverables (Milestone 4)
    "deliverables.title": "المخرجات والملفات المعتمدة (Deliverables)",
    "deliverables.subtitle":
      "سجل المخرجات الموثقة الناتجة عن الوكلاء الـ 8 مع تقييم الجودة",
    "deliverables.empty":
      "لا توجد مخرجات حتى الآن. قم بتشغيل أحد الوكلاء لإنتاج أول مخرج!",
    "deliverables.col_title": "عنوان المخرج",
    "deliverables.col_agent": "الوكيل المنفّذ",
    "deliverables.col_project": "المشروع",
    "deliverables.col_score": "تقييم الجودة",
    "deliverables.col_status": "الحالة",
    "deliverables.col_date": "تاريخ الإصدار",
    "deliverables.status_delivered": "معتمد ومُسلّم",
    "deliverables.status_approved": "موافق عليه نهائياً",
    "deliverables.inspect": "معاينة الملف",
    "deliverables.inspect_title": "تفاصيل ومحتوى المخرج المعتمد",

    // Workflows (Milestone 5 - Om Samah)
    "workflows.title": "محرك مسارات العمل (Workflow Builder)",
    "workflows.subtitle":
      "المديرة التنفيذية (أم سماح) - تفكيك المهام وإدارة شبكة الوكلاء وتدفق العمل المتوازي",
    "workflows.start_button": "بدء مسار عمل مستقل ⚡",
    "workflows.modal_title": "تكليف المديرة التنفيذية (أم سماح)",
    "workflows.request_label": "وصف المهمة أو التوجيه الاستراتيجي",
    "workflows.request_placeholder":
      "مثال: خطط لحملة تسويقية وعلاقات عامة متكاملة لمطعم فاخر جديد في القاهرة...",
    "workflows.load_sample": "تحميل نموذج تكليف جاهز",
    "workflows.initiating": "جارٍ التخطيط وبناء المخطط التوجيهي (DAG)...",
    "workflows.start_now": "إطلاق مسار العمل الآن",
    "workflows.empty":
      "لا توجد مسارات عمل نشطة. قم بإطلاق أول مسار تحت قيادة أم سماح!",
    "workflows.col_request": "التوجيه / طلب العميل",
    "workflows.col_status": "الحالة",
    "workflows.col_steps": "المراحل والوكلاء",
    "workflows.col_date": "تاريخ البدء",
    "workflows.dag_title": "المخطط التوجيهي للمسار (DAG Execution Graph)",
    "workflows.dag_subtitle":
      "تتبع تسلسل المهام والاعتماديات والتنفيذ المتوازي بالوقت الفعلي (Real-time Live Sync)",
    "workflows.step_approval_banner":
      "تنبيه تنفيذي: هناك مرحلة بانتظار الاعتماد والموافقة البشرية قبل التجميع النهائي",
    "workflows.step_approval_btn": "مراجعة واعتماد المرحلة 🛡️",
    "workflows.approval_modal_title":
      "اعتماد وتصريح المرحلة التنفيذية (Human Approval)",
    "workflows.approval_notes": "ملاحظات الاعتماد والتوجيهات الإضافية",
    "workflows.approve_btn": "اعتماد واستكمال المسار ✅",
    "workflows.reject_btn": "رفض المرحلة ❌",
    "workflows.compiled_package_title":
      "الحزمة التنفيذية النهائية المعتمدة من أم سماح",
    "workflows.download_package": "تحميل الحزمة الشاملة (JSON)",

    // Memory (Milestone 6)
    "memory.title": "نظام الذاكرة المؤسسية والمعرفة (Knowledge & Memory)",
    "memory.subtitle":
      "تخزين واسترجاع ذاكرة الوكالة، العملاء، المشاريع، وخبرات الوكلاء بالبحث الدلالي المتجه (Vector Embeddings)",
    "memory.add_button": "إضافة معلومة للذاكرة 🧠",
    "memory.search_placeholder":
      "ابحث دلالياً في الذاكرة (مثال: الهوية البصرية، ألوان المطعم، نبرة الخطاب، إرشادات النشر)...",
    "memory.searching": "جارٍ البحث الدلالي المتجه (<=>)...",
    "memory.tab_all": "جميع الذكريات",
    "memory.tab_organization": "الوكالة (Org)",
    "memory.tab_client": "العملاء (Clients)",
    "memory.tab_project": "المشاريع (Projects)",
    "memory.tab_agent": "الوكلاء (Agents)",
    "memory.match_score": "تطابق دلالي",
    "memory.empty":
      "لا توجد ذكريات مسجلة مطابقة. أضف أول معلومة للذاكرة لتمكين الوكلاء من تذكرها!",
    "memory.modal_title": "إضافة سياق جديد للذاكرة المتجهة",
    "memory.type_label": "مستوى الذاكرة",
    "memory.ref_label": "المرجع المرتبط",
    "memory.content_label": "محتوى الذاكرة وقواعد الحقيقة (Ground Truth)",
    "memory.metadata_label": "وسوم إضافية (Tags)",
    "memory.save": "تضمين وحفظ بالذاكرة 💾",
    "memory.cancel": "إلغاء",
    "memory.delete_confirm": "هل أنت متأكد من حذف هذه الذاكرة نهائياً؟",

    // Deliverables v2 Enhancements (Milestone 6)
    "deliverables.filter_all": "الكل",
    "deliverables.filter_client": "تصفية بالعميل:",
    "deliverables.filter_agent": "تصفية بالوكيل:",
    "deliverables.filter_type": "تصفية بالنوع:",
    "deliverables.new_version": "إصدار جديد ⚡",
    "deliverables.view_versions": "سجل الإصدارات",
    "deliverables.version_badge": "إصدار",
    "deliverables.modal_version_title":
      "سجل وسلسلة إصدارات المخرج (Version Lineage)",
    "deliverables.modal_new_version_title":
      "إنشاء إصدار جديد من المخرج المعتمد",
    "deliverables.version_notes": "تعديلات وتفاصيل الإصدار الجديد",
    "deliverables.version_save": "حفظ وتوليد الإصدار الجديد",

    // Approvals (Milestone 7)
    "approvals.title": "مركز الموافقات البشرية",
    "approvals.subtitle":
      "مراجعة واعتماد وتعديل القرارات الحساسة للوكلاء قبل التنفيذ (Human-in-the-Loop)",
    "approvals.tab_all": "الكل",
    "approvals.tab_pending": "بانتظار الموافقة",
    "approvals.tab_approved": "تمت الموافقة",
    "approvals.tab_rejected": "مرفوضة",
    "approvals.tab_edited": "معدّلة ومعتمدة",
    "approvals.action_approve": "موافقة فورية",
    "approvals.action_reject": "رفض",
    "approvals.action_edit": "تعديل واعتماد",
    "approvals.col_agent": "الوكيل الطالب",
    "approvals.col_action": "نوع الإجراء الحساس",
    "approvals.col_workflow": "مسار العمل / المهمة",
    "approvals.col_payload": "تفاصيل الحمولة (Payload)",
    "approvals.col_status": "الحالة",
    "approvals.empty": "لا توجد طلبات موافقة مطابقة",
    "approvals.modal_edit_title": "تعديل واعتماد الإجراء الحساس",
    "approvals.modal_edit_desc":
      "قم بتعديل بيانات الحمولة قبل السماح للوكيل بتنفيذ الإجراء",
    "approvals.notes_placeholder": "ملاحظات الاعتماد أو أسباب التعديل...",
    "approvals.confirm_reject":
      "هل أنت متأكد من رفض هذا الطلب وإيقاف تنفيذ الإجراء؟",
    "approvals.live_connected": "متصل مباشرة (Live WebSocket)",

    // Integrations (Milestone 7)
    "integrations.title": "مركز التكاملات والأدوات الخارجية",
    "integrations.subtitle":
      "ربط المنصات السحابية ومصادر البيانات ومولدات الوسائط بأمان (Google, Meta, Instagram, AI Tools)",
    "integrations.btn_connect": "ربط وتفعيل",
    "integrations.btn_disconnect": "فصل التكامل",
    "integrations.btn_test": "اختبار الاتصال",
    "integrations.status_connected": "متصل ونشط",
    "integrations.status_disconnected": "غير متصل",
    "integrations.status_requires_api_access": "يتطلب تصريح API",
    "integrations.status_error": "خطأ في الاتصال",
    "integrations.scopes_label": "الصلاحيات المطلوبة:",
    "integrations.modal_title": "إعداد وتوصيل أداة",
    "integrations.modal_save": "حفظ والاتصال",
    "integrations.token_placeholder":
      "أدخل رمز الوصول (Access Token / API Key)...",
    "integrations.category_all": "جميع الفئات",
    "integrations.category_founder": "حزمة المؤسس (Founder Stack)",
    "integrations.category_storage": "التخزين والمستندات",
    "integrations.category_marketing": "الإعلانات والتسويق",
    "integrations.category_social": "منصات التواصل",
    "integrations.category_media": "توليد الوسائط (AI)",
    "integrations.category_database": "قواعد البيانات والمصادقة",
    "integrations.category_payments": "المدفوعات والفواتير",
    "integrations.category_productivity": "المهام والإنتاجية",
    "integrations.category_infra": "البنية التحتية والسحاب",

    // Analytics (Milestone 10)
    "analytics.title": "مركز التحليلات وتتبع التكلفة (Analytics & Cost)",
    "analytics.subtitle":
      "رصد استهلاك الرموز (Tokens)، تكلفة النماذج، أداء الوكلاء ومؤشرات الجودة بدقة متناهية",
    "analytics.kpi_tokens": "إجمالي الرموز المستهلكة",
    "analytics.kpi_cost": "التكلفة التقديرية الإجمالية ($)",
    "analytics.kpi_quality": "متوسط درجة الجودة والامتثال",
    "analytics.kpi_latency": "متوسط سرعة المعالجة",
    "analytics.chart_cost_trend": "مسار استهلاك التكلفة اليومي ($ USD)",
    "analytics.chart_top_agents": "أعلى الوكلاء استهلاكاً للتكلفة والموارد",
    "analytics.chart_models": "توزيع التكلفة حسب نماذج الذكاء الاصطناعي",
    "analytics.table_title": "سجل عمليات التنفيذ والاستهلاك (AI Usage Logs)",
    "analytics.export_csv": "تصدير السجل إلى ملف CSV",
    "analytics.filter_agent": "تصفية بالوكيل:",
    "analytics.filter_project": "تصفية بالمشروع:",
    "analytics.all_agents": "جميع الوكلاء (38)",
    "analytics.all_projects": "جميع المشاريع",
    "analytics.col_time": "الوقت والتاريخ",
    "analytics.col_agent": "الوكيل المنفّذ",
    "analytics.col_project": "المشروع المربوط",
    "analytics.col_model": "النموذج",
    "analytics.col_tokens": "الرموز (Tokens)",
    "analytics.col_cost": "التكلفة ($)",
    "analytics.col_latency": "الزمن (ms)",
    "analytics.empty": "لا توجد سجلات استهلاك تطابق معايير التصفية المحددة",
  },
  en: {
    // Top Bar
    "app.name": "PR AI WORKFORCE",
    "app.subtitle": "Intelligent Workforce Operating System",
    "nav.org": "PR Agency Internal",
    "nav.logout": "Logout",
    "role.owner": "Owner",
    "role.member": "Member",

    // Sidebar 14 items
    "nav.command_center": "Command Center",
    "nav.studio": "Production Studio",
    "nav.virtual_office": "Virtual Office",
    "nav.agents": "Agents",
    "nav.departments": "Departments",
    "nav.tasks": "Tasks",
    "nav.workflows": "Workflow Builder",
    "nav.approvals": "Approvals",
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
    "dash.welcome_sub":
      "Central operating system coordinating 38 specialized AI employees and CEO Orchestrator Om Samah.",
    "dash.total_clients": "Total Clients",
    "dash.active_projects": "Active Projects",
    "dash.total_retainer": "Total Retainer Revenue",
    "dash.total_projects": "Total Projects",
    "dash.empty_cta_title": "Add your first client",
    "dash.empty_cta_desc":
      "No clients recorded yet in the database. Add your first client to link projects and delegate work to AI agents.",
    "dash.add_client": "Add New Client",
    "dash.add_project": "Add New Project",
    "dash.recent_clients": "Recent Clients",
    "dash.recent_projects": "Recent Projects",
    "dash.view_all": "View All",
    "dash.no_recent": "No records found",

    // Clients
    "clients.title": "Clients Management",
    "clients.subtitle":
      "Agency client roster, industries, brand identities and assignees",
    "clients.search": "Search by name, industry, or contact...",
    "clients.new_button": "New Client",
    "clients.col_client": "Client",
    "clients.col_industry": "Industry",
    "clients.col_contact": "Contact Person",
    "clients.col_assigned": "Assignee",
    "clients.col_actions": "Actions",
    "clients.view": "View",
    "clients.delete": "Delete",
    "clients.delete_confirm":
      "Are you sure you want to delete this client? All linked projects will also be deleted.",
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
    "projects.subtitle":
      "Track client engagements, retainer budgets, status and timelines",
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
    "project_detail.tasks_placeholder":
      "38 Specialized AI agents and automated workflow pipelines will be linked here in M3 & M4.",

    // Tasks (Milestone 3)
    "tasks.title": "Tasks & Execution Engine",
    "tasks.subtitle":
      "Track work streams, assignments, and real-time project progress synchronization (Live WebSocket)",
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
    "tasks.drag_hint":
      "Drag card to change its status & progress automatically",
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

    // Agents (Milestone 8 - Full 38 Roster)
    "agents.title": "AI Workforce Directory",
    "agents.subtitle":
      "Orchestrate and deploy all 38 specialized AI employees across 8 agency departments",
    "agents.all_departments": "All Departments",
    "agents.search_placeholder": "Search by name, role, department or tools...",
    "agents.no_results": "No agents matching your search",
    "agents.active_roster": "Active Agents on Roster",
    "agents.status_ready": "Ready for Briefing",
    "agents.status_active": "Active & Processing",
    "agents.run_button": "Deploy Agent",
    "agents.console_title": "Agent Execution & Briefing Console",
    "agents.select_project": "Associated Project",
    "agents.select_project_placeholder": "Select project...",
    "agents.input_brief": "Task Brief & Parameters (JSON Input)",
    "agents.load_sample": "Load Sample Brief",
    "agents.running": "Agent executing with neural intelligence...",
    "agents.execute_now": "Execute Task Now ⚡",
    "agents.output_title": "Validated Structured Deliverable",
    "agents.quality_score": "Quality Score",
    "agents.view_deliverables": "View in Deliverables",
    "agents.download_json": "Download JSON",
    "agents.tools_count": "Connected Tools",
    "agents.criteria_title": "Quality & Compliance Criteria",
    "agents.system_prompt": "System Prompt & Directives",

    // Virtual Office (Milestone 9)
    "virtual_office.title": "Virtual Office (Interactive Simulation)",
    "virtual_office.subtitle":
      "Live visual command center of all 38 AI employees across 8 agency department rooms with real-time WebSocket sync",
    "virtual_office.status_all": "All Statuses",
    "virtual_office.status_idle": "Idle & Ready",
    "virtual_office.status_working": "Working ⚡",
    "virtual_office.status_blocked": "Blocked ⚠️",
    "virtual_office.live_sync": "Live WebSocket Active",
    "virtual_office.drawer_title": "Agent Profile & Command Console",
    "virtual_office.execute_cta": "Chat & Deploy Agent ⚡",
    "virtual_office.view_tasks": "View Tasks in Task Manager",
    "virtual_office.simulate_status": "Simulate Status:",
    "virtual_office.current_task": "Current Active Task:",
    "virtual_office.recent_deliverables": "Recent Verified Deliverables",
    "virtual_office.no_deliverables":
      "No deliverables produced by this agent yet",
    "virtual_office.search_placeholder":
      "Search by name, role, or department in Virtual Office...",
    "virtual_office.department_zones": "Department Studios & Zones",

    // Deliverables (Milestone 4)
    "deliverables.title": "Verified Deliverables",
    "deliverables.subtitle":
      "Immutable audit repository of all outputs produced by specialized AI agents",
    "deliverables.empty":
      "No deliverables yet. Deploy an agent to generate your first verified deliverable!",
    "deliverables.col_title": "Deliverable Title",
    "deliverables.col_agent": "Executing Agent",
    "deliverables.col_project": "Project",
    "deliverables.col_score": "Quality Score",
    "deliverables.col_status": "Status",
    "deliverables.col_date": "Timestamp",
    "deliverables.status_delivered": "Delivered",
    "deliverables.status_approved": "Approved",
    "deliverables.inspect": "Inspect File",
    "deliverables.inspect_title": "Deliverable Inspection & Schema Payload",

    // Workflows (Milestone 5 - Om Samah)
    "workflows.title": "Workflow Builder (DAG)",
    "workflows.subtitle":
      "Om Samah (CEO Orchestrator) - Request decomposition, agent coordination & parallel DAG execution",
    "workflows.start_button": "Start Autonomous Workflow ⚡",
    "workflows.modal_title": "Task Om Samah (CEO Orchestrator)",
    "workflows.request_label": "Campaign Brief or Strategic Request",
    "workflows.request_placeholder":
      "e.g., Plan luxury grand opening PR campaign for new Cairo restaurant client...",
    "workflows.load_sample": "Load Sample Brief",
    "workflows.initiating": "Analyzing objective and planning DAG subtasks...",
    "workflows.start_now": "Launch Workflow Now",
    "workflows.empty":
      "No workflows found. Launch your first autonomous pipeline directed by Om Samah!",
    "workflows.col_request": "Client Brief / Request",
    "workflows.col_status": "Status",
    "workflows.col_steps": "Steps & Agents",
    "workflows.col_date": "Date Started",
    "workflows.dag_title": "DAG Execution Graph",
    "workflows.dag_subtitle":
      "Real-time task dependencies, parallel agent execution & live status sync",
    "workflows.step_approval_banner":
      "Executive Alert: A pipeline step requires human sign-off before final package compilation",
    "workflows.step_approval_btn": "Review & Approve Step 🛡️",
    "workflows.approval_modal_title": "Executive Human Approval Gate",
    "workflows.approval_notes": "Approval Notes & Guidance",
    "workflows.approve_btn": "Approve & Resume Pipeline ✅",
    "workflows.reject_btn": "Reject Step ❌",
    "workflows.compiled_package_title":
      "Final Executive PR Package Sealed by Om Samah",
    "workflows.download_package": "Download Master Package (JSON)",

    // Memory (Milestone 6)
    "memory.title": "Knowledge & Memory Base",
    "memory.subtitle":
      "Persistent multi-level context & semantic vector search across agency, clients, projects, and agents",
    "memory.add_button": "Add Memory Context 🧠",
    "memory.search_placeholder":
      "Search memory semantically (e.g., brand guidelines, tone of voice, color palette)...",
    "memory.searching": "Searching vector embeddings (<=>)...",
    "memory.tab_all": "All Memories",
    "memory.tab_organization": "Agency (Org)",
    "memory.tab_client": "Clients",
    "memory.tab_project": "Projects",
    "memory.tab_agent": "Agents",
    "memory.match_score": "Match Score",
    "memory.empty":
      "No memory records found matching criteria. Add your first memory context!",
    "memory.modal_title": "Add Vector Memory Context",
    "memory.type_label": "Memory Level",
    "memory.ref_label": "Associated Reference",
    "memory.content_label": "Memory Content & Ground Truth",
    "memory.metadata_label": "Metadata Tags",
    "memory.save": "Embed & Save Memory 💾",
    "memory.cancel": "Cancel",
    "memory.delete_confirm":
      "Are you sure you want to permanently delete this memory item?",

    // Deliverables v2 Enhancements (Milestone 6)
    "deliverables.filter_all": "All",
    "deliverables.filter_client": "Filter by Client:",
    "deliverables.filter_agent": "Filter by Agent:",
    "deliverables.filter_type": "Filter by Type:",
    "deliverables.new_version": "New Version ⚡",
    "deliverables.view_versions": "Version History",
    "deliverables.version_badge": "Version",
    "deliverables.modal_version_title": "Deliverable Version History & Lineage",
    "deliverables.modal_new_version_title": "Create New Deliverable Version",
    "deliverables.version_notes": "Version Changes & Refinements",
    "deliverables.version_save": "Save & Seal New Version",

    // Approvals (Milestone 7)
    "approvals.title": "Human Approvals Hub",
    "approvals.subtitle":
      "Review, approve, and edit high-impact agent actions before execution (Human-in-the-Loop)",
    "approvals.tab_all": "All",
    "approvals.tab_pending": "Pending Approval",
    "approvals.tab_approved": "Approved",
    "approvals.tab_rejected": "Rejected",
    "approvals.tab_edited": "Edited & Approved",
    "approvals.action_approve": "Approve",
    "approvals.action_reject": "Reject",
    "approvals.action_edit": "Edit & Approve",
    "approvals.col_agent": "Requesting Agent",
    "approvals.col_action": "Sensitive Action",
    "approvals.col_workflow": "Workflow / Task",
    "approvals.col_payload": "Payload Details",
    "approvals.col_status": "Status",
    "approvals.empty": "No approval requests match the selected filter",
    "approvals.modal_edit_title": "Edit & Approve Sensitive Action",
    "approvals.modal_edit_desc":
      "Modify the action payload parameters before granting execution clearance to the agent",
    "approvals.notes_placeholder": "Review notes or edit justification...",
    "approvals.confirm_reject":
      "Are you sure you want to reject this request and halt action execution?",
    "approvals.live_connected": "Live WebSocket Connected",

    // Integrations (Milestone 7)
    "integrations.title": "External Tools & Integration Hub",
    "integrations.subtitle":
      "Securely connect cloud workspaces, ad platforms, and generative media tools (Google, Meta, Instagram, AI Tools)",
    "integrations.btn_connect": "Connect Tool",
    "integrations.btn_disconnect": "Disconnect",
    "integrations.btn_test": "Test Connection",
    "integrations.status_connected": "Connected & Active",
    "integrations.status_disconnected": "Disconnected",
    "integrations.status_requires_api_access": "Requires API Access",
    "integrations.status_error": "Connection Error",
    "integrations.scopes_label": "Required Scopes:",
    "integrations.modal_title": "Configure Integration Provider",
    "integrations.modal_save": "Save & Authenticate",
    "integrations.token_placeholder":
      "Enter Access Token / API Key / Service Credentials...",
    "integrations.category_all": "All Categories",
    "integrations.category_founder": "Founder Stack (Dev & Cloud)",
    "integrations.category_storage": "Workspace & Docs",
    "integrations.category_marketing": "Ads & Marketing",
    "integrations.category_social": "Social Media",
    "integrations.category_media": "AI Media Generation",
    "integrations.category_database": "Databases & Auth",
    "integrations.category_payments": "Payments & Billing",
    "integrations.category_productivity": "Tasks & Productivity",
    "integrations.category_infra": "Infrastructure & Edge",

    // Analytics (Milestone 10)
    "analytics.title": "Analytics & Cost Tracking",
    "analytics.subtitle":
      "Comprehensive monitoring of token consumption, model costs, quality trends, and agent latency",
    "analytics.kpi_tokens": "Total Tokens Consumed",
    "analytics.kpi_cost": "Total Estimated Cost ($)",
    "analytics.kpi_quality": "Avg Quality Score",
    "analytics.kpi_latency": "Avg Response Latency",
    "analytics.chart_cost_trend": "Daily Cost Consumption Trend ($ USD)",
    "analytics.chart_top_agents": "Top Agents by Cost & Usage",
    "analytics.chart_models": "Cost Distribution by Model",
    "analytics.table_title": "AI Execution Usage Logs",
    "analytics.export_csv": "Export CSV",
    "analytics.filter_agent": "Filter by Agent:",
    "analytics.filter_project": "Filter by Project:",
    "analytics.all_agents": "All Agents (38)",
    "analytics.all_projects": "All Projects",
    "analytics.col_time": "Timestamp",
    "analytics.col_agent": "Agent",
    "analytics.col_project": "Project",
    "analytics.col_model": "Model",
    "analytics.col_tokens": "Tokens",
    "analytics.col_cost": "Cost ($)",
    "analytics.col_latency": "Latency (ms)",
    "analytics.empty": "No execution logs match the selected filters",
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  isAr: true,
  setLang: () => {},
  toggleLang: () => {},
  t: key => key,
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
      <div
        dir={isAr ? "rtl" : "ltr"}
        className={isAr ? "font-cairo" : "font-inter"}
      >
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
