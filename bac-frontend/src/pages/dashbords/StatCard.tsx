interface Props{
title:string
value:number
}

export default function StatCard({title,value}:Props){

return(

<div className="bg-white shadow rounded p-6">

<p className="text-gray-500">{title}</p>

<h2 className="text-2xl font-bold text-blue-600">
{value}
</h2>

</div>

)

}