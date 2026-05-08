import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  Save,
  Shield,
  User,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { updateProfile as saveProfile } from '@frontend/api/services/profile';

const SECTIONS = [
  { id: 'profile', label: 'Profile Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-colors duration-300 focus:border-cyan-400';

function normalizeText(value) {
  const cleaned = String(value || '').trim();
  return cleaned || null;
}

function normalizeGradeLevel(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) {
    return null;
  }
  if (!/^\d+$/.test(cleaned)) {
    return undefined;
  }
  const grade = Number.parseInt(cleaned, 10);
  return Number.isFinite(grade) ? grade : undefined;
}

export default function ProfileSettings({ onUpdate }) {
  const { user, profile, updateProfile } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    avatar_url: profile?.avatar_url || '',
    school_name: profile?.school_name || profile?.schoolName || '',
    student_code: profile?.student_code || profile?.studentCode || '',
    class_code: profile?.class_code || profile?.classCode || '',
    grade_level: profile?.grade_level || profile?.gradeLevel || '',
    academic_year: profile?.academic_year || profile?.academicYear || '',
    current_semester: profile?.current_semester || profile?.currentSemester || '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || user?.email || '',
      avatar_url: profile.avatar_url || '',
      school_name: profile.school_name || profile.schoolName || '',
      student_code: profile.student_code || profile.studentCode || '',
      class_code: profile.class_code || profile.classCode || '',
      grade_level: profile.grade_level || profile.gradeLevel || '',
      academic_year: profile.academic_year || profile.academicYear || '',
      current_semester: profile.current_semester || profile.currentSemester || '',
    });
  }, [profile, user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileUpdate = async () => {
    if (!profileData.first_name.trim() || !profileData.last_name.trim()) {
      showMessage('error', 'First name and last name are required');
      return;
    }

    const gradeLevel = normalizeGradeLevel(profileData.grade_level);
    if (gradeLevel === undefined) {
      showMessage('error', 'Grade level must be a number, for example 10, 11, or 12');
      return;
    }

    setIsLoading(true);

    try {
      const nextProfile = await saveProfile({
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        avatar_url: normalizeText(profileData.avatar_url),
        school_name: normalizeText(profileData.school_name),
        student_code: normalizeText(profileData.student_code),
        class_code: normalizeText(profileData.class_code),
        grade_level: gradeLevel,
        academic_year: normalizeText(profileData.academic_year),
        current_semester: normalizeText(profileData.current_semester),
      });

      if (updateProfile) {
        updateProfile(nextProfile);
      }

      if (onUpdate) {
        onUpdate(nextProfile);
      }

      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('error', 'All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showMessage('success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      showMessage('error', error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = (title, icon, children) => {
    const Icon = icon;

    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm fade-in-up"
      >
        <h3 className="mb-6 flex items-center text-xl font-semibold text-slate-900">
          <Icon className="mr-2" size={20} />
          {title}
        </h3>
        {children}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border-l-4 p-4 fade-in-up ${
            message.type === 'success'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-red-500 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 transition-all duration-300 ${
                isActive
                  ? 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{section.label}</span>
            </button>
          );
        })}
      </div>

      {activeSection === 'profile' &&
        renderCard(
          'Profile Information',
          User,
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink text-2xl font-bold text-black">
                  {profileData.first_name?.[0] || '?'}
                  {profileData.last_name?.[0] || ''}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Profile Picture</h4>
                <p className="text-sm text-slate-500">Upload a new avatar or change your current one</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">First Name *</label>
                <input
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Last Name *</label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                value={profileData.email}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                placeholder="your.email@example.com"
              />
              <p className="mt-1 text-xs text-slate-400">Email cannot be changed from here</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">School Name</label>
                <input
                  type="text"
                  value={profileData.school_name}
                  onChange={(e) => setProfileData({ ...profileData, school_name: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="International University"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Student Code</label>
                <input
                  type="text"
                  value={profileData.student_code}
                  onChange={(e) => setProfileData({ ...profileData, student_code: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="IU2026001"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Class Code</label>
                <input
                  type="text"
                  value={profileData.class_code}
                  onChange={(e) => setProfileData({ ...profileData, class_code: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="10A1"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Grade Level</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={profileData.grade_level}
                  onChange={(e) => setProfileData({ ...profileData, grade_level: e.target.value.replace(/\D/g, '') })}
                  className={FIELD_CLASS}
                  placeholder="10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Academic Year</label>
                <input
                  type="text"
                  value={profileData.academic_year}
                  onChange={(e) => setProfileData({ ...profileData, academic_year: e.target.value })}
                  className={FIELD_CLASS}
                  placeholder="2026-2027"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Current Semester</label>
              <input
                type="text"
                value={profileData.current_semester}
                onChange={(e) => setProfileData({ ...profileData, current_semester: e.target.value })}
                className={FIELD_CLASS}
                placeholder="Semester 1"
              />
              <p className="mt-1 text-xs text-slate-400">
                These fields will be copied into each assessment attempt to track progress over multiple years.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProfileUpdate}
                disabled={isLoading}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-neon-cyan to-blue-500 px-6 py-3 font-semibold text-black transition-all duration-300 hover:shadow-lg hover:shadow-neon-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={18} />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}

      {activeSection === 'security' &&
        renderCard(
          'Security Settings',
          Shield,
          <div className="space-y-6">
            <div>
              <h4 className="mb-4 font-medium text-slate-900">Change Password</h4>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`${FIELD_CLASS} pr-12`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-neon-pink to-purple-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-neon-pink/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={18} />
                <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
