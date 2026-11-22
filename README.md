# Laboratorio 13 Directorio de empleados en AWS

Aplicación web para administrar empleados mediante un CRUD, almacenar los datos en Amazon DynamoDB y conservar fotografías privadas en Amazon S3. El repositorio también incluye una plantilla de infraestructura para la práctica de VPC, EC2 y Amazon Aurora.

## Ejecución local sin costos AWS

```bash
copy .env.example .env
npm install
npm start
```

Abrir `http://127.0.0.1:8080`.

El valor `DATA_MODE=local` guarda los registros en `data/employees.json` y las fotografías en `storage/uploads`. Estos archivos están excluidos de Git.

## Modo AWS

Configurar:

```env
DATA_MODE=aws
AWS_REGION=us-east-1
DYNAMODB_TABLE=dsn5c-lab13-acampos-ddb-employees
S3_BUCKET=dsn5c-lab13-acampos-s3-employee-photos-<ACCOUNT_ID>
```

La aplicación utiliza la cadena de credenciales estándar de AWS. En EC2 debe ejecutarse con el IAM Role creado por CloudFormation, sin claves de acceso en archivos.

## Infraestructura

La plantilla `infrastructure/lab13-stack.yml` crea:

- VPC con dos subredes públicas y dos privadas.
- Gateway de Internet y tablas de rutas.
- Endpoint Gateway gratuito para Amazon S3.
- DynamoDB bajo demanda.
- Bucket S3 privado y cifrado.
- IAM Role de mínimo privilegio.
- Grupos de seguridad separados para web y base de datos.
- EC2 opcional.
- Aurora MySQL opcional con writer y reader.

EC2 y Aurora están desactivados por defecto. Se habilitan únicamente al tomar evidencias porque generan cargos.

## Seguridad

- El bucket bloquea todo acceso público.
- Las fotografías se consultan mediante URLs prefirmadas de corta duración.
- El puerto 3306 solo acepta tráfico desde el grupo de seguridad de EC2.
- SSH se restringe a una dirección `/32` definida por `AdminCidr`.
- No se guardan contraseñas ni credenciales de AWS en el repositorio.

## Limpieza

Antes de eliminar la pila, vaciar el bucket S3. Después ejecutar:

```bash
aws cloudformation delete-stack --stack-name dsn5c-lab13-acampos --region us-east-1
```

Comprobar que no queden instancias EC2, clústeres RDS, volúmenes EBS, snapshots, IP públicas ni objetos S3 del laboratorio.
