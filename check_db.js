const url = 'https://fewtzxuiwdnchjcszzep.supabase.co/rest/v1/profiles?select=*&limit=1';
fetch(url, {
  headers: {
    'apikey': 'sb_publishable_fLKl-MNqXEfhNq_I6QHLFA_KkbQE5Zd',
    'Authorization': 'Bearer sb_publishable_fLKl-MNqXEfhNq_I6QHLFA_KkbQE5Zd'
  }
}).then(res => res.json()).then(data => console.log(Object.keys(data[0] || {})));
