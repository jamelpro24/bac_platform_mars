export default function Home(){

return(

<div className="container mt-5">

<h2 className="text-center mb-5">
لوحة التحكم
</h2>

<div className="row g-4">

<div className="col-md-3">

<div className="dashboard-card">

<i className="bi bi-building text-primary icon-animated"></i>

<h5 className="mt-3">
معطيات عامة
</h5>

</div>

</div>

<div className="col-md-3">

<div className="dashboard-card">

<i className="bi bi-door-open text-success icon-animated"></i>

<h5 className="mt-3">معطيات الدورة
</h5>

</div>

</div>

<div className="col-md-3">

<div className="dashboard-card">

<i className="bi bi-people text-warning icon-animated"></i>

<h5 className="mt-3">
تصميم القاعات
</h5>

</div>

</div>

<div className="col-md-3">

<div className="dashboard-card">

<i className="bi bi-person-badge text-danger icon-animated"></i>

<h5 className="mt-3">
برمجة الأساتذة
</h5>

</div>

</div>

</div>

</div>

)

}
