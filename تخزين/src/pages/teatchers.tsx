import {teachers} from "./dashbords/mocData"

export default function Teachers(){

return(

<div className="p-6 pt-24 mr-64">

<h2 className="text-2xl font-bold mb-6">
قائمة الأساتذة
</h2>

<table className="w-full bg-white shadow rounded text-right">

<thead>

<tr className="border-b">

<th className="p-2">الاسم</th>
<th className="p-2">المادة</th>
<th className="p-2">البريد</th>
<th className="p-2">الهاتف</th>

</tr>

</thead>

<tbody>

{teachers.map((t,i)=>(
<tr key={i} className="border-b">

<td className="p-2">{t.name}</td>
<td className="p-2">{t.subject}</td>
<td className="p-2">{t.email}</td>
<td className="p-2">{t.phone}</td>

</tr>
))}

</tbody>

</table>

</div>

)

}