<?php
     include 'conecta.php';    

    $sql = "insert into tb_usuario values (null, '$nome', '$sobrenome', '$email','$login', '$foto')";
    if ($conn->query($sql)) {
        // echo "Registro inserido com sucesso!";

        // echo "Nome: ".$nome." <br> Sobrenome: ".$sobrenome."<br>  Email: ".$email." <br> Senha: ".$senha." <br> Login: ".$login." <br>   Foto: ".$foto."<br>  Número: ".$numero."" ;
    }
    
    ?>