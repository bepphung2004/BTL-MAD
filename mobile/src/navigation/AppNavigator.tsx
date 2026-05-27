import InterviewInviteScreen from '../screens/hr/jobs/InterviewInviteScreen';
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { notificationService } from "../services/notificationService";
import { connectNotificationSocket, disconnectNotificationSocket } from '../services/notificationSocket';
import { useIsFocused } from "@react-navigation/native";
import { COLORS } from "../constants";
import { useAppSelector } from "../store/hooks";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

// Main Screens
import HomeScreen from "../screens/main/HomeScreen";
import JobsScreen from "../screens/main/JobsScreen";
import CompaniesScreen from "../screens/main/CompaniesScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

// Detail Screens
import JobDetailScreen from "../screens/detail/JobDetailScreen";
import ApplicationDetailScreen from "../screens/detail/ApplicationDetailScreen";

// Profile Screens
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import MyCVsScreen from "../screens/profile/MyCVsScreen";
import JobSubscriptionScreen from "../screens/profile/JobSubscriptionScreen";
import MyApplicationsScreen from "../screens/profile/MyApplicationsScreen";
import ChangePasswordScreen from "../screens/profile/ChangePasswordScreen";
import CVTemplateSelectScreen from "../screens/profile/cv/CVTemplateSelectScreen";
import CVFormScreen from "../screens/profile/cv/CVFormScreen";

// Admin Screens
import UsersListScreen from "../screens/admin/user/UsersListScreen";
import UserDetailScreen from "../screens/admin/user/UserDetailScreen";
import UserFormScreen from "../screens/admin/user/UserFormScreen";
import CandidatesListScreen from "../screens/admin/candidate/CandidatesListScreen";
import CandidateDetailScreen from "../screens/admin/candidate/CandidateDetailScreen";
import RegisterHrScreen from "@/screens/auth/RegisterRrScreen";
import AdminCompaniesListScreen from "@/screens/admin/company/AdminCompaniesListScreen";
import AdminCompanyDetailScreen from "@/screens/admin/company/AdminCompanyDetailScreen";
import HrCompanyDetailScreen from "../screens/hr/company/HrCompanyDetailScreen";
import HrCompanyUpdateScreen from "../screens/hr/company/HrCompanyUpdateScreen";
import HrNoCompanyScreen from "../screens/hr/company/HrNoCompanyScreen";
import HrCreateCompanyScreen from "../screens/hr/company/HrCreateCompanyScreen";
import HrJoinCompanyScreen from "../screens/hr/company/HrJoinCompanyScreen";
import HrJobsListScreen from "../screens/hr/jobs/HrJobsListScreen";
import HrJobDetailScreen from "../screens/hr/jobs/HrJobDetailScreen";
import HrJobFormScreen from "../screens/hr/jobs/HrJobFormScreen";
import HrPendingApprovalScreen from "../screens/hr/HrPendingApprovalScreen";
import { CompanyDetailScreen } from "@/screens";
import HrApplicationsListScreen from "../screens/hr/jobs/HrApplicationsListScreen";
import HrApplicationDetailScreen from "../screens/hr/jobs/HrApplicationDetailScreen";
import AdminPendingHrsScreen from "../screens/admin/hr/AdminPendingHrsScreen";
import { ICompany, IJob, IUser } from '@/types';
const HrTab = createBottomTabNavigator();

const HrTabs = () => {
  const { user } = useAppSelector((state) => state.auth);
  const hasCompany = !!user?.company?._id;
  const isApproved = user?.isApproved !== false;

  // Determine which component to show for Company/Jobs tabs based on approval status
  const companyComponent = !isApproved
    ? HrPendingApprovalScreen
    : hasCompany
      ? HrCompanyDetailScreen
      : HrNoCompanyScreen;
  const jobsComponent = !isApproved ? HrPendingApprovalScreen : HrJobsListScreen;

  return (
    <HrTab.Navigator

      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case "HrCompany":
              iconName = focused ? "business" : "business-outline";
              break;
            case "Notifications":
              return (
                <NotificationTabIcon
                  color={color}
                  size={size}
                  focused={focused}
                />
              );
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            case "HrJobs":
              iconName = focused ? "briefcase" : "briefcase-outline";
              break;
 
            default:
              iconName = "help-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[100],
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <HrTab.Screen
        name="HrCompany"
        component={companyComponent}
        options={{ tabBarLabel: "Công ty" }}
      />
      <HrTab.Screen
        name="HrJobs"
        component={jobsComponent}
        options={{ tabBarLabel: "Việc làm" }}
      />
      <HrTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: "Thông báo" }}
      />
      <HrTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Tài khoản" }}
      />
    </HrTab.Navigator>
  );
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  RegisterHr: undefined;
  ForgotPassword: undefined;
  JobDetail: { jobId: string };
  CompanyDetail: { companyId: string };
  ApplicationDetail: { applicationId: string };
  EditProfile: undefined;
  MyCVs: undefined;
  MyApplications: undefined;
  JobSubscription: undefined;
  AdminCompanyDetail: { companyId: string };
  ChangePassword: undefined;
  Admin: undefined;
  Dashboard: undefined;
  ManageUser: undefined;
  HrJobDetail: { job: any };
  HrJobForm: { job?: any };
  HrCompanyUpdate: undefined;
  HrCreateCompany: undefined;
  HrJoinCompany: undefined;
  ManageCompany: undefined;
  UsersList: undefined;
  UserDetail: { userId: string };
  UserForm: { userId?: string };
  CandidatesList: undefined;
  CandidateDetail: { userId: string };
  HrApplicationsList: { jobId: string };
  HrApplicationDetail: { applicationId: string };
  InterviewInvite: {
    user: IUser | undefined;
    job: IJob | undefined;
    company: ICompany | undefined;
    email: string;
  };
  CVTemplateSelect: undefined;
  CVFormScreen: { templateType: string; cvId?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Jobs: undefined;
  Companies: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Stats: undefined;
  Users: undefined;
  Companies: undefined;
  PendingHrs: undefined;
  Jobs: undefined;
  Profile: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="RegisterHr" component={RegisterHrScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const NotificationTabIcon = ({
  color,
  size,
  focused,
}: {
  color: string;
  size: number;
  focused: boolean;
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const fetchUnread = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchUnread();
  }, []);

  useEffect(() => {
    if (isFocused) fetchUnread();
  }, [isFocused]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    const socket = connectNotificationSocket(user._id);
    if (socket) {
      socket.on('notification', () => {
        fetchUnread();
      });
    }
    return () => {
      if (socket) socket.off('notification');
      disconnectNotificationSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?._id]);

  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "notifications" : "notifications-outline"}
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -8,
            backgroundColor: "#ef4444",
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
            borderWidth: 2,
            borderColor: "#fff",
            zIndex: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;
        if (route.name === "Notifications") {
          return (
            <NotificationTabIcon color={color} size={size} focused={focused} />
          );
        }
        switch (route.name) {
          case "Home":
            iconName = focused ? "home" : "home-outline";
            break;
          case "Jobs":
            iconName = focused ? "briefcase" : "briefcase-outline";
            break;
          case "Companies":
            iconName = focused ? "business" : "business-outline";
            break;
          case "Profile":
            iconName = focused ? "person" : "person-outline";
            break;
          default:
            iconName = "help-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[100],
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ tabBarLabel: "Trang chủ" }}
    />
    <Tab.Screen
      name="Jobs"
      component={JobsScreen}
      options={{ tabBarLabel: "Việc làm" }}
    />
    <Tab.Screen
      name="Companies"
      component={CompaniesScreen}
      options={{ tabBarLabel: "Công ty" }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ tabBarLabel: "Thông báo" }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarLabel: "Tài khoản" }}
    />
  </Tab.Navigator>
);

const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabs = () => {
  const { user } = useAppSelector((state) => state.auth);
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === "Notifications") {
            return (
              <NotificationTabIcon
                color={color}
                size={size}
                focused={focused}
              />
            );
          }
          switch (route.name) {
            case "Stats":
              iconName = focused ? "stats-chart" : "stats-chart-outline";
              break;
            case "Users":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Companies":
              iconName = focused ? "business" : "business-outline";
              break;
            case "PendingHrs":
              iconName = focused ? "shield-checkmark" : "shield-checkmark-outline";
              break;
            case "Jobs":
              iconName = focused ? "briefcase" : "briefcase-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "help-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[100],
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      {/* <AdminTab.Screen name="Stats" component={HomeScreen} options={{ tabBarLabel: 'Thống kê' }} /> */}

      <>
        <AdminTab.Screen
          name="Users"
          component={CandidatesListScreen}
          options={{ tabBarLabel: "Ứng viên" }}
        />
        <AdminTab.Screen
          name="Companies"
          component={AdminCompaniesListScreen}
          options={{ tabBarLabel: "Công ty" }}
        />
        <AdminTab.Screen
          name="PendingHrs"
          component={AdminPendingHrsScreen}
          options={{ tabBarLabel: "Duyệt HR" }}
        />
      </>

      {/* <AdminTab.Screen name="Jobs" component={JobsScreen} options={{ tabBarLabel: 'Tin tuyển dụng' }} /> */}
      <AdminTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: "Thông báo" }}
      />
      <AdminTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Tài khoản" }}
      />
    </AdminTab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAppSelector(
    (state) => state.auth,
  );
  const role = user?.role;

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : role == "USER" ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="JobDetail"
              component={JobDetailScreen}
              options={{ headerShown: true, title: "Chi tiết việc làm" }}
            />
            <Stack.Screen
              name="CompanyDetail"
              component={CompanyDetailScreen}
              options={{ headerShown: true, title: "Chi tiết công ty" }}
            />
            <Stack.Screen
              name="ApplicationDetail"
              component={ApplicationDetailScreen}
              options={{ headerShown: true, title: "Chi tiết ứng tuyển" }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: "Chỉnh sửa hồ sơ" }}
            />
            <Stack.Screen
              name="MyCVs"
              component={MyCVsScreen}
              options={{ headerShown: true, title: "Quản lý CV" }}
            />
            <Stack.Screen
              name="CVTemplateSelect"
              component={CVTemplateSelectScreen}
              options={{ headerShown: true, title: "Chọn mẫu CV" }}
            />
            <Stack.Screen
              name="CVFormScreen"
              component={CVFormScreen}
              options={{ headerShown: true, title: "Tạo CV online" }}
            />
            <Stack.Screen
              name="MyApplications"
              component={MyApplicationsScreen}
              options={{ headerShown: true, title: "Hồ sơ ứng tuyển" }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: "Đổi mật khẩu" }}
            />
            <Stack.Screen
              name="JobSubscription"
              component={JobSubscriptionScreen}
              options={{ headerShown: false }}
            />
            
          </>
        ) : role == "HR" ? (
          <>
            <Stack.Screen name="Main" component={HrTabs} />
            <Stack.Screen
              name="HrCompanyUpdate"
              component={HrCompanyUpdateScreen}
              options={{ headerShown: true, title: "Cập nhật công ty" }}
            />
            <Stack.Screen
              name="HrCreateCompany"
              component={HrCreateCompanyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="HrJoinCompany"
              component={HrJoinCompanyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="HrJobDetail"
              component={HrJobDetailScreen}
              options={{ headerShown: true, title: "Chi tiết công việc" }}
            />
            <Stack.Screen
              name="HrJobForm"
              component={HrJobFormScreen}
              options={{ headerShown: true, title: "Tạo / Cập nhật công việc" }}
            />
            <Stack.Screen
              name="HrApplicationsList"
              component={HrApplicationsListScreen}
              options={{ headerShown: true, title: "Danh sách ứng viên" }}
            />
            <Stack.Screen
              name="HrApplicationDetail"
              component={HrApplicationDetailScreen}
              options={{ headerShown: true, title: "Thông tin ứng viên" }}
            />
            <Stack.Screen
              name="InterviewInvite"
              component={InterviewInviteScreen}
              options={{ headerShown: true, title: "Gửi thư mời phỏng vấn" }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: "Chỉnh sửa hồ sơ" }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: "Đổi mật khẩu" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={AdminTabs} />

            <Stack.Screen
              name="ManageUser"
              component={UsersListScreen}
              options={{ headerShown: true, title: "Quản lý người dùng" }}
            />
            <Stack.Screen
              name="ManageCompany"
              component={AdminCompaniesListScreen}
              options={{ headerShown: true, title: "Quản lý công ty" }}
            />
            <Stack.Screen
              name="AdminCompanyDetail"
              component={AdminCompanyDetailScreen}
              options={{ headerShown: true, title: "Chi tiết công ty" }}
            />
            <Stack.Screen
              name="UserForm"
              component={UserFormScreen}
              options={({ route }) => ({
                headerShown: true,
                title:
                  route?.params && (route.params as any).userId
                    ? "Cập nhật người dùng"
                    : "Tạo người dùng",
              })}
            />
            <Stack.Screen
              name="UserDetail"
              component={UserDetailScreen}
              options={{ headerShown: true, title: "Cập nhật người dùng" }}
            />
            <Stack.Screen
              name="CandidateDetail"
              component={CandidateDetailScreen}
              options={{ headerShown: true, title: "Chi tiết ứng viên" }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: "Chỉnh sửa hồ sơ" }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: "Đổi mật khẩu" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
