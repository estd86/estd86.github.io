
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>График воды</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        button { padding: 10px; margin: 5px; }
        canvas { width: 100%; height: 300px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>График потребления воды</h1>
        <button onclick="loadData()">Загрузить тестовые данные</button>
        <canvas id="chart"></canvas>
    </div>
    
    <script>
        function loadData() {
            const data = {
                labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                datasets: [{
                    label: 'Вода (мл)',
                    data: [1500, 1800, 2200, 1900, 2100, 1700, 2000],
                    backgroundColor: '#29b6f6'
                }]
            };
            
            new Chart(document.getElementById('chart'), {
                type: 'bar',
                data: data
            });
        }
    </script>
</body>
