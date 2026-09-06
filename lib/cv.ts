const skillCatalog = [
  "Python","Java","JavaScript","TypeScript","React","Next.js","Node.js","NestJS","Angular","Vue.js","C","C++","C#","Go","Rust","Kotlin","Swift","PHP","Symfony","Laravel","Ruby","Rails",
  "SQL","PostgreSQL","MySQL","MongoDB","Redis","Docker","Kubernetes","AWS","Azure","GCP","Git","Linux","Terraform","Ansible","Jenkins","GitHub Actions","CI/CD",
  "Pandas","NumPy","PyTorch","TensorFlow","scikit-learn","Machine Learning","Deep Learning","NLP","LLM","Data Science","Data Analysis","Power BI","Tableau","Excel","Spark","Airflow","dbt",
  "REST","GraphQL","FastAPI","Django","Spring","Spring Boot","Microservices","Agile","Scrum","Figma","UX","UI","Cybersécurité","DevOps","Cloud"
];

function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}

export function extractCvSkills(text:string){
  const corpus=` ${normalize(text).replace(/[^a-z0-9+#./-]+/g," ")} `;
  return skillCatalog.filter(skill=>{
    const term=normalize(skill);
    if(term.length<=3)return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}([^a-z0-9]|$)`).test(corpus);
    return corpus.includes(term);
  });
}
