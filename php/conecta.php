<?php
    $username = 'root';
    $password = '';
    // Root - Biblioteca
    // admin - Laboratório
    // Vazio - Casa

    try {
        $conn = new PDO('mysql:host=localhost;dbname=bd_aper', $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        echo 'Erro na conexão: ' . $e->getMessage();
    }    
    ?> 