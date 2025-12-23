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
