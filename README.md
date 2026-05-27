# Phùng Đức Bách - B22DCCN055 - Nhóm lớp: 05 - Nhóm BTL: 04

---

## MỤC LỤC - CÁC CHỨC NĂNG CÁ NHÂN THỰC HIỆN
* [1. Đăng ký tài khoản dưới tư cách ứng viên hoặc nhà tuyển dụng](#1-đăng-ký-tài-khoản-dưới-tư-cách-ứng-viên-hoặc-nhà-tuyển-dụng)
* [2. Đăng nhập hệ thống](#2-đăng-nhập-hệ-thống)
* [3. Đổi mật khẩu](#3-đổi-mật-khẩu)
* [4. Đăng xuất](#4-đăng-xuất)
* [5. Quên mật khẩu](#5-quên-mật-khẩu)
* [6. Người dùng quản lý thông tin cá nhân (sửa hồ sơ)](#6-người-dùng-quản-lý-thông-tin-cá-nhân-sửa-hồ-sơ)
* [7. Ứng viên tìm kiếm việc làm với bộ lọc](#7-ứng-viên-tìm-kiếm-việc-làm-với-bộ-lọc)
* [8. Ứng viên xem chi tiết tin tuyển dụng](#8-ứng-viên-xem-chi-tiết-tin-tuyển-dụng)

---

### 1. Đăng ký tài khoản dưới tư cách ứng viên hoặc nhà tuyển dụng

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `RegisterScreen.tsx` | `mobile/src/screens/auth/` | Giao diện đăng ký tài khoản cho Ứng viên (USER), tiếp nhận thông tin và validate các trường nhập ở client. |
| `RegisterHrScreen.tsx` | `mobile/src/screens/auth/` | Giao diện đăng ký tài khoản cho Nhà tuyển dụng (HR), quản lý thêm các thông tin doanh nghiệp như MST, quy mô, tên công ty. |
| `authSlice.ts` | `mobile/src/redux/slices/` | Quản lý state đăng ký tài khoản cục bộ và định nghĩa Redux Thunk action `register` không đồng bộ để điều phối API. |
| `authService.ts` | `mobile/src/services/` | Cung cấp client API service để gửi HTTP POST request đăng ký (CreateUserDto hoặc CreateHrDto) lên Server qua Axios. |
| `auth.controller.ts` | `backend/src/auth/` | Phân phối các endpoint `POST /auth/register` (USER) và `POST /auth/hr/register` (HR), thực thi ValidationPipe. |
| `auth.service.ts` | `backend/src/auth/` | Xử lý logic đăng ký chính: kiểm tra trùng email, gán vai trò mặc định, băm mật khẩu, gửi thông báo hệ thống phê duyệt HR cho các Admin. |
| `users.service.ts` | `backend/src/users/` | Cung cấp phương thức mã hóa mật khẩu thô `hashPassword` bằng bcryptjs với Salt Rounds 10. |
| `user.schema.ts` | `backend/src/users/schemas/` | Định nghĩa Schema người dùng ánh xạ MongoDB, bao gồm thuộc tính nhúng `registrationCompany` cho HR. |
| `notification.schema.ts` | `backend/src/notifications/schemas/` | Định nghĩa Schema thông báo hệ thống dùng để gửi thông báo yêu cầu duyệt HR mới cho Admin. |

---

### 2. Đăng nhập hệ thống

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `LoginScreen.tsx` | `mobile/src/screens/auth/` | Giao diện nhận Email và Mật khẩu, thực hiện validate client cơ bản và hiển thị thông báo lỗi khi đăng nhập thất bại. |
| `authSlice.ts` | `mobile/src/redux/slices/` | Quản lý state đăng nhập toàn cục (`isAuthenticated`, `user` info) và đồng bộ thông tin tài khoản sau khi đăng nhập thành công. |
| `tokenStorage.ts` | `mobile/src/services/` | Lớp tiện ích cung cấp các hàm lưu và mã hóa bảo mật Access Token vào `SecureStore` của hệ điều hành thiết bị di động. |
| `authService.ts` | `mobile/src/services/` | Cung cấp client API service gửi HTTP POST request đăng nhập chứa body `{ username, password }` đến Server. |
| `local.strategy.ts` | `backend/src/auth/passport/` | Kế thừa Passport Local Strategy để thực hiện xác thực tài khoản cục bộ thông qua cờ LocalAuthGuard. |
| `auth.controller.ts` | `backend/src/auth/` | Cung cấp endpoint `POST /auth/login` tiếp nhận request đăng nhập, áp dụng LocalAuthGuard và ThrottlerGuard bảo mật. |
| `auth.service.ts` | `backend/src/auth/` | Xác thực: kiểm tra cờ khóa tài khoản `isLocked`, so khớp bcrypt mật khẩu, ký số cặp mã JWT Access Token và Refresh Token, gán cookie. |
| `users.service.ts` | `backend/src/users/` | Cung cấp phương thức `updateUserToken` thực thi cập nhật Refresh Token mới của người dùng vào MongoDB. |
| `user.schema.ts` | `backend/src/users/schemas/` | Định nghĩa Schema user dùng để truy tìm thông tin tài khoản và kiểm tra trạng thái khóa `isLocked`. |

---

### 3. Đổi mật khẩu

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `ChangePasswordScreen.tsx` | `mobile/src/screens/profile/` | Giao diện nhận Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu mới, validate client. |
| `userService.ts` | `mobile/src/services/` | Gửi HTTP POST request đổi mật khẩu chứa body `{ oldPassword, newPassword }`, tự động gắn JWT Access Token ở header. |
| `jwt.strategy.ts` | `backend/src/auth/passport/` | Chiến lược giải mã JWT Access Token nhận được ở Authorization header để xác thực danh tính người dùng. |
| `users.controller.ts` | `backend/src/users/` | Cung cấp endpoint `POST /users/change-password` bảo vệ nghiêm ngặt bằng JwtAuthGuard để bảo vệ tài khoản. |
| `users.service.ts` | `backend/src/users/` | Truy vấn user kèm mật khẩu ẩn, so khớp bcrypt mật khẩu cũ. Nếu khớp, tiến hành băm mật khẩu mới và ghi đè vào DB. |
| `user.schema.ts` | `backend/src/users/schemas/` | Ánh xạ và thực hiện cập nhật ghi đè trường `password` băm mới của người dùng trong MongoDB. |

---

### 4. Đăng xuất

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `ProfileScreen.tsx` | `mobile/src/screens/profile/` | Màn hình menu cá nhân chứa nút Đăng xuất, hiển thị Alert xác nhận đăng xuất từ phía người dùng. |
| `authSlice.ts` | `mobile/src/redux/slices/` | Định nghĩa action `logout` để đặt lại trạng thái đăng nhập Redux store về mặc định và giải phóng user cục bộ. |
| `tokenStorage.ts` | `mobile/src/services/` | Cung cấp hàm `clearTokens` thực thi xóa sạch Access Token khỏi vùng nhớ bảo mật `SecureStore` của thiết bị di động. |
| `authService.ts` | `mobile/src/services/` | Thực hiện gửi HTTP POST request yêu cầu đăng xuất lên Server kèm theo JWT trong header. |
| `auth.controller.ts` | `backend/src/auth/` | Tiếp nhận request đăng xuất tại endpoint `POST /auth/logout` được bảo vệ bởi JwtAuthGuard. |
| `auth.service.ts` | `backend/src/auth/` | Xử lý thu hồi Refresh Token trên DB (gán chuỗi rỗng `""`) và xóa sạch các Cookie phiên làm việc của client. |
| `user.schema.ts` | `backend/src/users/schemas/` | Ánh xạ cấu trúc dữ liệu người dùng để thực thi xóa Refresh Token trong MongoDB qua Mongoose. |

---

### 5. Quên mật khẩu

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `ForgotPasswordScreen.tsx` | `mobile/src/screens/auth/` | Màn hình giao diện khôi phục tài khoản 3 bước (yêu cầu gửi OTP, xác thực OTP và nhập mật khẩu mới). |
| `authService.ts` | `mobile/src/services/` | Cung cấp các API gửi request POST xử lý 3 bước khôi phục mật khẩu thô lên Server qua Axios. |
| `otps.controller.ts` | `backend/src/otps/` | Phân phối endpoint `POST /otps` (Bước 1) và `POST /otps/verify-otp` (Bước 2) không yêu cầu Guard xác thực. |
| `otps.service.ts` | `backend/src/otps/` | Xử lý sinh OTP Token số 32-bit ngẫu nhiên bảo mật cao, lưu DB với TTL 10 phút, gọi MailService gửi mail. |
| `auth.controller.ts` | `backend/src/auth/` | Cung cấp endpoint đặt lại mật khẩu tại `POST /auth/reset-password` (Bước 3). |
| `auth.service.ts` | `backend/src/auth/` | Điều phối thu hồi mã OTP Token bảo mật một lần sử dụng duy nhất và gọi băm mật khẩu mới. |
| `users.service.ts` | `backend/src/users/` | Gọi xác thực OTP, xóa OTP ngay để chống Replay Attack, tìm user theo email của OTP để cập nhật mật khẩu. |
| `otp.schema.ts` | `backend/src/otps/schemas/` | Định nghĩa Schema OTP có cấu hình chỉ mục tự động xóa TTL 10 phút (`expires: '10m'`). |
| `user.schema.ts` | `backend/src/users/schemas/` | Định nghĩa Schema user, thực hiện ghi đè mật khẩu băm mới sau khi xác thực và thu hồi OTP thành công. |

---

### 6. Người dùng quản lý thông tin cá nhân (sửa hồ sơ)

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `EditProfileScreen.tsx` | `mobile/src/screens/profile/` | Giao diện chỉnh sửa thông tin, tích hợp chụp/chọn ảnh đại diện sử dụng thư viện Expo Image Picker. |
| `userService.ts` | `mobile/src/services/` | Gửi HTTP PATCH cập nhật hồ sơ và HTTP POST upload ảnh đại diện dạng Multipart Form Data kèm JWT. |
| `files.controller.ts` | `backend/src/files/` | Tiếp nhận và xử lý upload file ảnh đại diện từ client tại endpoint `POST /files/upload-image` sử dụng FileInterceptor. |
| `users.controller.ts` | `backend/src/users/` | Tiếp nhận request cập nhật tại endpoint `PATCH /users/profile`, thực thi gán cứng ID bảo mật chống lỗ hổng IDOR. |
| `users.service.ts` | `backend/src/users/` | Thực hiện lưu allowed fields vào DB, ghi nhận thông tin audit trail lưu vết người chỉnh sửa vào trường `updatedBy`. |
| `user.schema.ts` | `backend/src/users/schemas/` | Định nghĩa Schema user, lưu trữ các trường dữ liệu cập nhật (`name, age, gender, address, avatar, updatedBy`). |

---

### 7. Ứng viên tìm kiếm việc làm với bộ lọc

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `JobsScreen.tsx` | `mobile/src/screens/jobs/` | Giao diện tìm kiếm việc làm, lọc theo các tiêu chí (tên, địa điểm, kỹ năng, lương) và hiển thị FlatList dạng vô hạn cuộn. |
| `jobSlice.ts` | `mobile/src/redux/slices/` | Quản lý state danh sách việc làm, lưu trữ danh sách và thông tin phân trang nhận về từ API. |
| `jobService.ts` | `mobile/src/services/` | Gửi HTTP GET request tìm kiếm phân trang có mang query string cấu hình các tiêu chí lọc lên Server. |
| `jobs.controller.ts` | `backend/src/jobs/` | Cung cấp endpoint công khai `GET /jobs` tiếp nhận request tìm kiếm của người dùng. |
| `jobs.service.ts` | `backend/src/jobs/` | Xử lý tách lương, phân tích query URL qua thư viện `aqp`, chèn cờ ẩn job thuộc doanh nghiệp bị khóa, phân trang và truy vấn DB. |
| `job.schema.ts` | `backend/src/jobs/schemas/` | Định nghĩa Schema Job chứa thông tin cơ bản của doanh nghiệp tuyển dụng nhúng trực tiếp (embedded object). |

---

### 8. Ứng viên xem chi tiết tin tuyển dụng

| Tên file | Vị trí (Thư mục) | Vai trò của file |
| :--- | :--- | :--- |
| `JobDetailScreen.tsx` | `mobile/src/screens/detail/` | Giao diện xem chi tiết công việc, render mô tả HTML, tag kỹ năng và hiển thị modal chọn CV ứng tuyển nộp hồ sơ. |
| `jobSlice.ts` | `mobile/src/redux/slices/` | Quản lý đối tượng công việc chi tiết hiện tại đang chọn để hiển thị lên màn hình detail (`currentJob`). |
| `jobService.ts` | `mobile/src/services/` | Gửi HTTP GET request đến endpoint `/jobs/:id` để tải thông tin chi tiết một công việc cụ thể. |
| `jobs.controller.ts` | `backend/src/jobs/` | Cung cấp endpoint công khai `GET /jobs/:id` xem chi tiết công việc. |
| `jobs.service.ts` | `backend/src/jobs/` | Thực hiện truy vấn MongoDB tìm kiếm tin tuyển dụng theo ID. Không cần populate company nhờ company nhúng sẵn. |
| `job.schema.ts` | `backend/src/jobs/schemas/` | Định nghĩa Schema Job, dùng để truy xuất chi tiết một bản ghi và thông tin company nhúng. |
