import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export const ADMIN_EMAIL = "prathik.raman@gmail.com";
const localAdmin: ChatGPTUser = { displayName: "Prathik Raman", email: ADMIN_EMAIL, fullName: "Prathik Raman" };
const isLocalDevelopment = () => process.env.NODE_ENV !== "production";

export async function requireAdminUser(): Promise<ChatGPTUser> {
  const optionalUser = await getChatGPTUser();
  const user = optionalUser ?? (isLocalDevelopment() ? localAdmin : await requireChatGPTUser("/admin"));
  if (user.email.toLowerCase() !== ADMIN_EMAIL) throw new Error("This account is not authorized to manage the journal.");
  return user;
}

export async function getAdminUserForApi(): Promise<ChatGPTUser | null> {
  const user = (await getChatGPTUser()) ?? (isLocalDevelopment() ? localAdmin : null);
  return user?.email.toLowerCase() === ADMIN_EMAIL ? user : null;
}
