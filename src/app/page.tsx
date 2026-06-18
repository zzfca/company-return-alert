'use client';

import { useEffect, useState } from 'react';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyWithDetails,
  getFilings,
  createFiling,
  markFilingCompleted,
  cancelFiling,
  restoreFiling,
  deleteFiling,
  uploadDocument,
  deleteDocument,
  changePassword,
  getAuditLogs,
} from '@/app/actions';
import type { Company, Filing, Document } from '@/db/schema';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const filingTypeNames: Record<string, string> = {
  income_tax: '年度报税',
  gst: 'GST申报',
  annual_report: '年报',
};

const statusNames: Record<string, string> = {
  pending: '待申报',
  filed: '已完成',
  cancelled: '已取消',
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; name: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'filings' | 'logs'>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof getAuditLogs>>>([]);
  const [sortBy, setSortBy] = useState<'registration' | 'filing'>('registration');

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showFilingModal, setShowFilingModal] = useState(false);
  const [showCompanyDetail, setShowCompanyDetail] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: '', registrationNumber: '', address: '', city: 'Vancouver',
    province: 'BC', postalCode: '', phone: '', email: '',
    registrationDate: '', profitLoss: 0, notes: '', requiresGST: false,
  });

  const [filingForm, setFilingForm] = useState({
    companyId: 0, type: 'income_tax', year: new Date().getFullYear(),
    dueDate: '', amount: 0, notes: '',
  });

  const [documentForm, setDocumentForm] = useState<{
    name: string;
    type: string;
    file: File | null;
  }>({ name: '', type: 'receipt', file: null });

  useEffect(() => {
    // 从服务端获取当前登录状态
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then(({ user }) => {
        if (user) setCurrentUser(user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadCompanies();
      loadFilings();
      if (activeTab === 'logs') loadLogs();
    }
  }, [currentUser, sortBy, activeTab]);

  const loadCompanies = async () => {
    const data = await getCompanies(sortBy);
    setCompanies(data);
  };

  const loadFilings = async () => {
    const data = await getFilings();
    setFilings(data);
  };

  const loadLogs = async () => {
    const data = await getAuditLogs(100);
    setLogs(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const result = await response.json();

      if (response.ok && result.success && result.user) {
        setCurrentUser(result.user);
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(result.message || '用户名或密码错误');
      }
    } catch (error: any) {
      setLoginError(error?.message || '登录失败，请查看 Docker 日志');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      alert('密码修改成功');
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      alert(error.message || '密码修改失败');
    }
  };

  const handleCreateCompany = async () => {
    if (!companyForm.name || !companyForm.address || !companyForm.registrationDate) {
      alert('请填写必填项');
      return;
    }
    await createCompany(companyForm);
    await loadCompanies();
    setShowCompanyModal(false);
    setCompanyForm({
      name: '', registrationNumber: '', address: '', city: 'Vancouver',
      province: 'BC', postalCode: '', phone: '', email: '',
      registrationDate: '', profitLoss: 0, notes: '', requiresGST: false,
    });
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;
    await updateCompany(selectedCompany.id, companyForm);
    await loadCompanies();
    setShowCompanyModal(false);
    setSelectedCompany(null);
    setCompanyForm({
      name: '', registrationNumber: '', address: '', city: 'Vancouver',
      province: 'BC', postalCode: '', phone: '', email: '',
      registrationDate: '', profitLoss: 0, notes: '', requiresGST: false,
    });
  };

  const handleDeleteCompany = async (id: number) => {
    if (confirm('确定要删除这家公司吗？所有相关申报和文档也将被删除。')) {
      await deleteCompany(id);
      await loadCompanies();
      if (showCompanyDetail && selectedCompany?.id === id) {
        setShowCompanyDetail(false);
        setSelectedCompany(null);
      }
    }
  };

  const handleViewCompanyDetail = async (company: Company) => {
    const details = await getCompanyWithDetails(company.id);
    setSelectedCompany(details);
    setShowCompanyDetail(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanyForm({
      name: company.name,
      registrationNumber: company.registrationNumber || '',
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode || '',
      phone: company.phone || '',
      email: company.email || '',
      registrationDate: company.registrationDate,
      profitLoss: company.profitLoss || 0,
      notes: company.notes || '',
      requiresGST: company.requiresGST || false,
    });
    setShowCompanyModal(true);
  };

  const handleCreateFiling = async () => {
    if (!filingForm.companyId || !filingForm.dueDate) {
      alert('请选择公司并填写截止日期');
      return;
    }
    await createFiling(filingForm);
    await loadFilings();
    setShowFilingModal(false);
    setFilingForm({
      companyId: 0, type: 'income_tax', year: new Date().getFullYear(),
      dueDate: '', amount: 0, notes: '',
    });
  };

  const handleCompleteFiling = async (filingId: number) => {
    await markFilingCompleted(filingId);
    await loadFilings();
    if (selectedCompany) {
      const details = await getCompanyWithDetails(selectedCompany.id);
      setSelectedCompany(details);
    }
  };

  const handleCancelFiling = async (filingId: number) => {
    if (confirm('确定要取消这条申报记录吗？')) {
      await cancelFiling(filingId);
      await loadFilings();
      if (selectedCompany) {
        const details = await getCompanyWithDetails(selectedCompany.id);
        setSelectedCompany(details);
      }
    }
  };

  const handleRestoreFiling = async (filingId: number) => {
    await restoreFiling(filingId);
    await loadFilings();
    if (selectedCompany) {
      const details = await getCompanyWithDetails(selectedCompany.id);
      setSelectedCompany(details);
    }
  };

  const handleDeleteFiling = async (filingId: number) => {
    if (confirm('确定要永久删除这条申报记录吗？')) {
      await deleteFiling(filingId);
      await loadFilings();
      if (selectedCompany) {
        const details = await getCompanyWithDetails(selectedCompany.id);
        setSelectedCompany(details);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!documentForm.file || !selectedFiling) return;

    // 检查文件大小
    if (documentForm.file.size > MAX_FILE_SIZE) {
      alert(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileUrl = e.target?.result as string;
      await uploadDocument({
        companyId: selectedFiling.companyId,
        filingId: selectedFiling.id,
        name: documentForm.name || documentForm.file!.name,
        type: documentForm.type,
        fileUrl,
        mimeType: documentForm.file!.type,
      });

      const details = await getCompanyWithDetails(selectedFiling.companyId);
      setSelectedCompany(details);
      setShowDocumentModal(false);
      setSelectedFiling(null);
      setDocumentForm({ name: '', type: 'receipt', file: null });
    };
    reader.readAsDataURL(documentForm.file);
  };

  const handleDeleteDocument = async (docId: number, companyId: number) => {
    if (confirm('确定要删除这个文档吗？')) {
      await deleteDocument(docId);
      const details = await getCompanyWithDetails(companyId);
      setSelectedCompany(details);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">公司申报管理系统</h1>
            <p className="text-slate-500">BC省公司报税与文档管理</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">用户名</label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                placeholder="请输入密码"
              />
            </div>
            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:bg-blue-600 font-medium shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 计算下次申报日期（取最近的下次申报）
  const getNextDueDate = (company: Company) => {
    const companyFilings = filings.filter(f => f.companyId === company.id && f.status === 'pending');
    if (companyFilings.length === 0) return null;
    
    // 找到最近的下次申报
    const sorted = companyFilings.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return sorted[0].dueDate;
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (days <= 7) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    if (days <= 30) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  };

  const pendingFilings = filings.filter(f => f.status === 'pending');
  const upcomingFilings = pendingFilings.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const overdueFilings = pendingFilings.filter(f => getDaysUntilDue(f.dueDate) < 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">📊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">公司申报管理系统</h1>
                <p className="text-xs text-slate-500">BC省公司报税与文档管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">欢迎，<span className="font-semibold">{currentUser.name}</span></span>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                修改密码
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
          {[
            { key: 'dashboard', label: '📊 数据总览', icon: '📊' },
            { key: 'companies', label: '🏢 公司管理', icon: '🏢' },
            { key: 'filings', label: '📝 申报记录', icon: '📝' },
            { key: 'logs', label: '📜 操作日志', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: '公司总数', value: companies.length, icon: '🏢', color: 'blue' },
                { label: '待申报', value: pendingFilings.length, icon: '⏳', color: 'yellow' },
                { label: '已逾期', value: overdueFilings.length, icon: '🚨', color: 'red' },
                { label: '本月到期', value: pendingFilings.filter(f => {
                  const days = getDaysUntilDue(f.dueDate);
                  return days >= 0 && days <= 30;
                }).length, icon: '📅', color: 'green' },
              ].map((stat) => {
                const borderColor = stat.color === 'blue' ? 'border-blue-500' : stat.color === 'yellow' ? 'border-yellow-500' : stat.color === 'red' ? 'border-red-500' : 'border-green-500';
                return (
                <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                    <span className="text-4xl">{stat.icon}</span>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">⏰ 即将到期的申报</h2>
              <div className="space-y-3">
                {upcomingFilings.length === 0 ? (
                  <p className="text-center text-slate-500 py-6">暂无待申报记录</p>
                ) : (
                  upcomingFilings.map((filing) => {
                    const company = companies.find(c => c.id === filing.companyId);
                    const days = getDaysUntilDue(filing.dueDate);
                    return (
                      <div key={filing.id} className="flex items-center justify-between bg-slate-50/80 rounded-xl p-4 hover:bg-slate-100/80 transition-colors border border-slate-100">
                        <div className="flex items-center space-x-4">
                          <span className="text-2xl">
                            {filing.type === 'income_tax' ? '💰' : filing.type === 'gst' ? '🧾' : '📋'}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{company?.name}</p>
                            <p className="text-sm text-slate-600">{filingTypeNames[filing.type]} - {filing.year}年</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 mb-1">截止日期: {new Date(filing.dueDate).toLocaleDateString('zh-CN')}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(days)}`}>
                            {days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? '今天到期' : `剩余 ${days} 天`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">🏢 公司信息一览</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 font-semibold text-slate-500">公司名称</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-500">注册日期</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-500">最后申报</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-500">下次申报</th>
                      <th className="text-left py-3 px-2 font-semibold text-slate-500">GST申报</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.slice(0, 10).map((company) => {
                      const companyFilings = filings.filter(f => f.companyId === company.id);
                      const lastFiled = companyFilings
                        .filter(f => f.filedDate)
                        .sort((a, b) => new Date(b.filedDate!).getTime() - new Date(a.filedDate!).getTime())[0];
                      const gstFiling = companyFilings
                        .filter(f => f.type === 'gst')
                        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                      const lastFiledDate = lastFiled ? new Date(lastFiled.filedDate!).toLocaleDateString('zh-CN') : new Date(company.registrationDate).toLocaleDateString('zh-CN');
                      const nextDueDate = getNextDueDate(company);
                      return (
                        <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-2 font-medium text-slate-800">{company.name}</td>
                          <td className="py-3 px-2 text-slate-600">{new Date(company.registrationDate).toLocaleDateString('zh-CN')}</td>
                          <td className="py-3 px-2 text-slate-600">{lastFiledDate}</td>
                          <td className="py-3 px-2">
                            {nextDueDate ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(getDaysUntilDue(nextDueDate))}`}>
                                {new Date(nextDueDate).toLocaleDateString('zh-CN')} ({getDaysUntilDue(nextDueDate) < 0 ? `逾期${Math.abs(getDaysUntilDue(nextDueDate))}天` : `剩${getDaysUntilDue(nextDueDate)}天`})
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {company.requiresGST ? (
                              gstFiling ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(getDaysUntilDue(gstFiling.dueDate))}`}>
                                  {new Date(gstFiling.dueDate).toLocaleDateString('zh-CN')}
                                </span>
                              ) : (
                                <span className="text-green-600">需要申报</span>
                              )
                            ) : (
                              <span className="text-slate-400">无需</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {companies.length === 0 && (
                  <p className="text-center text-slate-500 py-6">暂无公司数据</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-slate-800">公司列表</h2>
                <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setSortBy('registration')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      sortBy === 'registration'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    按注册日期
                  </button>
                  <button
                    onClick={() => setSortBy('filing')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      sortBy === 'filing'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    按申报日期
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setCompanyForm({
                    name: '', registrationNumber: '', address: '', city: 'Vancouver',
                    province: 'BC', postalCode: '', phone: '', email: '',
                    registrationDate: '', profitLoss: 0, notes: '', requiresGST: false,
                  });
                  setShowCompanyModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-medium shadow-md hover:shadow-lg transition-all"
              >
                + 添加公司
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => {
                const companyFilings = filings.filter(f => f.companyId === company.id);
                const lastFiled = companyFilings
                  .filter(f => f.filedDate)
                  .sort((a, b) => new Date(b.filedDate!).getTime() - new Date(a.filedDate!).getTime())[0];
                const lastFiledDate = lastFiled ? new Date(lastFiled.filedDate!).toLocaleDateString('zh-CN') : new Date(company.registrationDate).toLocaleDateString('zh-CN');
                const nextDueDate = getNextDueDate(company);
                
                return (
                  <div
                    key={company.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg transition-all p-6 cursor-pointer border border-slate-200/60 hover:border-blue-200 group"
                    onClick={() => handleViewCompanyDetail(company)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{company.name}</h3>
                        <p className="text-sm text-slate-500">{company.registrationNumber || '未填写注册号'}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-slate-600">
                        <span className="mr-2">📅</span>
                        <span>注册: {new Date(company.registrationDate).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <span className="mr-2">🏁</span>
                        <span>最后申报: {lastFiledDate}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">⏰</span>
                        <span>下次申报: {nextDueDate ? `${new Date(nextDueDate).toLocaleDateString('zh-CN')} (${getDaysUntilDue(nextDueDate) < 0 ? `逾期${Math.abs(getDaysUntilDue(nextDueDate))}天` : `剩${getDaysUntilDue(nextDueDate)}天`})` : '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">🧾</span>
                        <span className={company.requiresGST ? 'text-green-600' : 'text-slate-400'}>
                          {company.requiresGST ? '需要GST' : '无需GST'}
                        </span>
                      </div>
                      {company.notes && (
                        <div className="flex items-start mt-2 pt-2 border-t border-slate-100">
                          <span className="mr-2 text-slate-400">📝</span>
                          <span className="text-slate-600 text-xs leading-relaxed">{company.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'filings' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">申报记录</h2>
              <button
                onClick={() => {
                  const firstCompany = companies[0];
                  let suggestedDate = '';
                  if (firstCompany) {
                    const base = new Date(firstCompany.registrationDate);
                    base.setMonth(base.getMonth() + 6);
                    suggestedDate = base.toISOString().split('T')[0];
                  }
                  setFilingForm({
                    companyId: firstCompany?.id || 0,
                    type: 'income_tax',
                    year: new Date().getFullYear(),
                    dueDate: suggestedDate,
                    amount: 0,
                    notes: '',
                  });
                  setShowFilingModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-medium shadow-md hover:shadow-lg transition-all"
              >
                + 添加申报
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <tr>
                      {['公司名称', '申报类型', '年度', '本次申报日期', '截止日期', '状态', '金额', '操作'].map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filings.map((filing) => {
                      const company = companies.find(c => c.id === filing.companyId);
                      const days = filing.status === 'pending' ? getDaysUntilDue(filing.dueDate) : null;
                      
                      return (
                        <tr key={filing.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{company?.name}</div>
                            <div className="text-xs text-slate-500">{company?.city}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-700">{filingTypeNames[filing.type]}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {filing.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {filing.filedDate ? new Date(filing.filedDate).toLocaleDateString('zh-CN') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">{new Date(filing.dueDate).toLocaleDateString('zh-CN')}</div>
                            {days !== null && (
                              <span className={`text-xs ${getUrgencyColor(days).replace('bg-', 'text-').replace('100', '600')}`}>
                                {days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? '今天' : `${days} 天后`}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              filing.status === 'filed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                              filing.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            }`}>
                              {statusNames[filing.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {filing.amount ? `$${filing.amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              {filing.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleCompleteFiling(filing.id)}
                                    className="text-green-600 hover:text-green-800"
                                    title="标记完成"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedFiling(filing);
                                      setDocumentForm({ name: '', type: 'receipt', file: null });
                                      setShowDocumentModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="上传文档"
                                  >
                                    📎
                                  </button>
                                  <button
                                    onClick={() => handleCancelFiling(filing.id)}
                                    className="text-orange-600 hover:text-orange-800"
                                    title="取消"
                                  >
                                    🚫
                                  </button>
                                </>
                              )}
                              {filing.status === 'cancelled' && (
                                <button
                                  onClick={() => handleRestoreFiling(filing.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="恢复"
                                >
                                  ↩️
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteFiling(filing.id)}
                                className="text-red-600 hover:text-red-800"
                                title="删除"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">操作日志</h2>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-2xl">
                    {log.action === 'create' ? '➕' : log.action === 'update' ? '✏️' : log.action === 'delete' ? '🗑️' : '📝'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{log.username}</span> {log.action === 'create' ? '创建' : log.action === 'update' ? '更新' : log.action === 'delete' ? '删除' : '操作'}了 <span className="font-medium">{log.entityType}</span> (ID: {log.entityId})
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCompanyDetail && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedCompany.name}</h2>
                  <p className="text-blue-100">{selectedCompany.registrationNumber || '未填写注册号'}</p>
                </div>
                <button
                  onClick={() => { setShowCompanyDetail(false); setSelectedCompany(null); }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">基本信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: '注册号码', value: selectedCompany.registrationNumber || '-' },
                    { label: '注册日期', value: new Date(selectedCompany.registrationDate).toLocaleDateString('zh-CN') },
                    { label: '地址', value: selectedCompany.address },
                    { label: '城市', value: selectedCompany.city },
                    { label: '省份', value: selectedCompany.province },
                    { label: '邮编', value: selectedCompany.postalCode || '-' },
                    { label: '电话', value: selectedCompany.phone || '-' },
                    { label: '邮箱', value: selectedCompany.email || '-' },
                    { label: '盈亏状况', value: `${(selectedCompany.profitLoss || 0) >= 0 ? '+' : ''}$${(selectedCompany.profitLoss || 0).toLocaleString()}` },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-slate-800">{item.value}</p>
                    </div>
                  ))}
                  
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">GST申报</p>
                    <p className="text-sm font-medium">
                      {selectedCompany.requiresGST ? (
                        <span className="text-green-600">✓ 需要申报</span>
                      ) : (
                        <span className="text-slate-400">✗ 不需要</span>
                      )}
                    </p>
                  </div>
                </div>
                {selectedCompany.notes && (
                  <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200/50">
                    <p className="text-xs text-slate-500 mb-1">备注</p>
                    <p className="text-sm text-slate-700">{selectedCompany.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">📜 历史申报记录</h3>
                <div className="bg-white rounded-xl p-4 hover:bg-slate-50 transition-colors border border-slate-100 mb-2 max-h-60 overflow-y-auto">
                  {selectedCompany.history && selectedCompany.history.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCompany.history.map((record: any) => (
                        <div key={record.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {record.type === 'income_tax' ? '💰' : 
                               record.type === 'gst' ? '🧾' : '📋'}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {filingTypeNames[record.type]} - {record.year}年
                              </p>
                              <p className="text-xs text-slate-500">
                                申报日期: {new Date(record.filedDate).toLocaleDateString('zh-CN')}
                                {record.amount > 0 && ` | 金额: $${record.amount.toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-full text-xs font-medium">
                            已完成
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">暂无历史记录</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">申报记录</h3>
                <div className="space-y-3">
                  {selectedCompany.filings && selectedCompany.filings.length > 0 ? (
                    selectedCompany.filings.map((filing: Filing) => {
                      const days = filing.status === 'pending' ? getDaysUntilDue(filing.dueDate) : null;
                      return (
                        <div key={filing.id} className="bg-slate-50/80 rounded-xl p-4 hover:bg-slate-100/80 transition-colors border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">
                                {filing.type === 'income_tax' ? '💰' : filing.type === 'gst' ? '🧾' : '📋'}
                              </span>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {filingTypeNames[filing.type]} - {filing.year}年
                                </p>
                                <p className="text-sm text-slate-600">
                                  截止: {new Date(filing.dueDate).toLocaleDateString('zh-CN')}
                                  {filing.filedDate && ` | 申报: ${new Date(filing.filedDate).toLocaleDateString('zh-CN')}`}
                                </p>
                                {filing.notes && (
                                  <p className="text-xs text-slate-500 mt-1">{filing.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {days !== null && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(days)}`}>
                                  {days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? '今天到期' : `剩余 ${days} 天`}
                                </span>
                              )}
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                filing.status === 'filed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                                filing.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              }`}>
                                {statusNames[filing.status]}
                              </span>
                              {filing.status === 'pending' && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleCompleteFiling(filing.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                    title="标记完成"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedFiling(filing);
                                      setDocumentForm({ name: '', type: 'receipt', file: null });
                                      setShowDocumentModal(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="上传文档"
                                  >
                                    📎
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500 py-6">暂无申报记录</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">文档资料</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedCompany.documents && selectedCompany.documents.length > 0 ? (
                    selectedCompany.documents.map((doc: Document) => (
                      <div key={doc.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors group relative border border-slate-100">
                        {doc.mimeType?.startsWith('image/') ? (
                          <img
                            src={doc.fileUrl}
                            alt={doc.name}
                            className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer"
                            onClick={() => setPreviewImage(doc.fileUrl)}
                          />
                        ) : (
                          <div className="w-full h-32 bg-slate-200 rounded-lg mb-2 flex items-center justify-center">
                            <span className="text-4xl">📄</span>
                          </div>
                        )}
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('zh-CN')}
                        </p>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, selectedCompany.id)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-slate-500 py-6">暂无文档</div>
                  )}
                </div>
              </div>

              {selectedCompany.lastModifiedByUser && (
                <div className="text-sm text-slate-500 text-right">
                  最后修改: {selectedCompany.lastModifiedByUser} · {new Date(selectedCompany.updatedAt).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {selectedCompany ? '编辑公司' : '创建公司'}
              </h2>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    公司名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="请输入公司名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">注册号码</label>
                  <input
                    type="text"
                    value={companyForm.registrationNumber}
                    onChange={(e) => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="BC1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    注册日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={companyForm.registrationDate}
                    onChange={(e) => setCompanyForm({ ...companyForm, registrationDate: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    地址 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">城市</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="Vancouver"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">省份</label>
                  <select
                    value={companyForm.province}
                    onChange={(e) => setCompanyForm({ ...companyForm, province: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  >
                    {['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">邮编</label>
                  <input
                    type="text"
                    value={companyForm.postalCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="V6B 1A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">电话</label>
                  <input
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="604-555-0001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">邮箱</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="info@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">盈亏状况 ($)</label>
                  <input
                    type="number"
                    value={companyForm.profitLoss}
                    onChange={(e) => setCompanyForm({ ...companyForm, profitLoss: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="50000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={companyForm.requiresGST}
                      onChange={(e) => setCompanyForm({ ...companyForm, requiresGST: e.target.checked })}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">需要GST申报</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-7">
                    勾选此项会自动为该公司创建年度GST申报记录
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                  <textarea
                    value={companyForm.notes}
                    onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="其他备注信息"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCompanyModal(false);
                    setSelectedCompany(null);
                    setCompanyForm({
                      name: '', registrationNumber: '', address: '', city: 'Vancouver',
                      province: 'BC', postalCode: '', phone: '', email: '',
                      registrationDate: '', profitLoss: 0, notes: '', requiresGST: false,
                    });
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={selectedCompany ? handleUpdateCompany : handleCreateCompany}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  {selectedCompany ? '保存修改' : '创建公司'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFilingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">创建申报记录</h2>
            </div>
            
            <div className="p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    选择公司 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filingForm.companyId}
                    onChange={(e) => setFilingForm({ ...filingForm, companyId: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  >
                    <option value={0}>请选择公司</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    申报类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filingForm.type}
                    onChange={(e) => setFilingForm({ ...filingForm, type: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  >
                    <option value="income_tax">年度报税</option>
                    <option value="gst">GST申报</option>
                    <option value="annual_report">年报</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    年度 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={filingForm.year}
                    onChange={(e) => setFilingForm({ ...filingForm, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    min={2000}
                    max={2100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    申报日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={filingForm.dueDate}
                    onChange={(e) => setFilingForm({ ...filingForm, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">首次创建时系统会根据注册日期自动建议申报日期，您可以手动修改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">金额 ($)</label>
                  <input
                    type="number"
                    value={filingForm.amount}
                    onChange={(e) => setFilingForm({ ...filingForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                  <textarea
                    value={filingForm.notes}
                    onChange={(e) => setFilingForm({ ...filingForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="其他备注信息"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowFilingModal(false);
                    setFilingForm({
                      companyId: 0, type: 'income_tax', year: new Date().getFullYear(),
                      dueDate: '', amount: 0, notes: '',
                    });
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateFiling}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  创建申报
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">上传文档</h2>
            </div>
            
            <div className="p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">文档名称</label>
                  <input
                    type="text"
                    value={documentForm.name}
                    onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                    placeholder="留空则使用文件名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">文档类型</label>
                  <select
                    value={documentForm.type}
                    onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  >
                    <option value="receipt">收据</option>
                    <option value="invoice">发票</option>
                    <option value="tax_return">报税单</option>
                    <option value="financial_statement">财务报表</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    选择文件 <span className="text-red-500">*</span>
                  </label>
                   <input
                     type="file"
                     accept="image/*,.pdf,.doc,.docx"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         if (file.size > MAX_FILE_SIZE) {
                           alert(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
                           e.target.value = '';
                           return;
                         }
                         setDocumentForm({ ...documentForm, file });
                       }
                     }}
                     className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                   />
                   <p className="text-xs text-slate-500 mt-2">
                     支持: 图片、PDF、Word文档（最大 5MB）
                   </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedFiling(null);
                    setDocumentForm({ name: '', type: 'receipt', file: null });
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!documentForm.file}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上传
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">修改密码</h2>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    原密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    新密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    确认新密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}



