export const logoutOnExpire = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.setItem("sessionExpired", "true");
    window.location.href = "/login";
}