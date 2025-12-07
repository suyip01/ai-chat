const e="/api",s={async login(n,t){const o=await fetch(`${e}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:n,password:t})});if(!o.ok)throw new Error("login_failed");return o.json()}};export{e as B,s as u};
//# sourceMappingURL=api-BQ_HNd4s.js.map
