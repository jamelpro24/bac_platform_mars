import { Bell, User, LogOut } from "lucide-react";

export default function Header() {
  return (

<header className="bg-white shadow fixed w-full z-10 flex justify-between items-center px-6 py-4">

<div className="flex gap-6">

<LogOut className="cursor-pointer text-red-500" />
<Bell className="cursor-pointer text-gray-600" />
<User className="cursor-pointer text-gray-600" />

</div>

<h1 className="text-xl font-bold text-blue-700">

مركز الأكاديمية للامتحانات

</h1>

</header>

  );
}