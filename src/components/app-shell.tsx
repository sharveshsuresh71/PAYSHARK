import { Sidebar } from "./sidebar";
export function AppShell({children}:{children:React.ReactNode}) {
 return <div className="shell lg:flex"><Sidebar/><main className="min-w-0 flex-1 px-5 py-6 md:px-9 md:py-9 max-w-[1500px]">{children}</main></div>;
}
