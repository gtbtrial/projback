const express = require('express')
const app = express()

app.use(express.urlencoded({extended:false}))
app.use(express.json())

require('dotenv').config()

const bcrypt = require('bcrypt');

const fs = require('fs');

var jwt = require('jsonwebtoken');

const nodemailer = require('nodemailer');

var cors = require('cors')
app.use(cors())

const uuid = require('uuid');

const mongoose = require('mongoose');

// mongoose.connect('mongodb://127.0.0.1:27017/groworld_db').then(() => console.log('Connected to MongoDB!'));;

mongoose.connect('mongodb+srv://dbuser:dbpass123@cluster0.vabkc0y.mongodb.net/grodb?retryWrites=true&w=majority&appName=Cluster0').then(() => console.log('Connected to MongoDB!'));;



const multer  = require('multer');

var picname;

let mystorage = multer.diskStorage({
    destination: (req, file, cb) => 
    {
      cb(null, "public/uploads");//we will have to create folder ourselves
    },
    filename: (req, file, cb) => 
    {
      picname = Date.now() + file.originalname;//milliseconds will be added with original filename and name will be stored in picname variable
      cb(null, picname);
    }
  });
  let upload = multer({ storage: mystorage });


  const transporter = nodemailer.createTransport({
    service : 'hotmail',
    auth : {
        user : 'groceryplanet@hotmail.com',
        pass : 'Grocery123#'
    }
  })

//   fs.watch("public/uploads", (eventType, filename) => {
//     if (eventType === 'change') {
//       // Notify connected clients
//       io.emit('fileChanged', filename);
//     }
//   });

  function verifytoken(req,res,next)
  {
    if(!req.headers.authorization)
    {
      res.status(401).send('Unauthorized Request')
    }
    let token = req.headers.authorization.split(' ')[1]
    if(token=='null')
    {
      return res.status(401).send('Unauthorized request')
    }
    let payload = jwt.verify(token, process.env.TOKEN_SECRET_KEY)
    if(!payload)
    {
      return res.status(401).send('Unauthorized Request')
    }
    next()
  }


var SignupSchema = new mongoose.Schema({
    name:String,
    phone:String,
    username:{type:String,unique:true},
    password:String,
    usertype:String,
    acttoken:String,
    actstatus:Boolean},{versionKey: false})

const SignupModel = mongoose.model("signup",SignupSchema,"signup")// internal model name, schema_name, collection_name

app.post("/api/signup",async(req,res)=>
{
    try
    {
        const encpass = bcrypt.hashSync(req.body.pass, 10);
        var token = uuid.v4();

        var newrecord = new SignupModel({name:req.body.pname,phone:req.body.phone,username:req.body.uname,password:encpass, usertype:req.body.utype,acttoken:token,actstatus:false});

        var result = await newrecord.save();
        if(result)
        {
            const mailOptions = {
                from: 'groceryplanet@hotmail.com',
                to: req.body.uname,
                subject: 'Account Activation Mail from ShoppingPlaza.com',
                text: `Hello ${req.body.pname}\n\nThanks for signing up on our website. Please click on the link below to activate your account and login on our website\n\n http://localhost:3000/activateaccount?token=${token}`
              };
            
              // Use the transport object to send the email
              transporter.sendMail(mailOptions, (error, info) => 
              {
                if (error) {
                  console.log(error);
                  res.send({statuscode:-2})
                } else 
                {
                
                  console.log('Email sent: ' + info.response);
                  res.send({statuscode:1});
                }
              });
            
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.post("/api/login",async(req,res)=>
{
    try
    {
        var result = await SignupModel.findOne({username:req.body.uname})
        if(result===null)
        {
            res.send({statuscode:0});
        }
        else
        {
            if(bcrypt.compareSync(req.body.pass, result.password)===true)
            {
                if(result.actstatus===true)
                {
                    if(result.usertype==="admin")
                    {
                        let token = jwt.sign({data: result._id}, process.env.TOKEN_SECRET_KEY, { expiresIn: '1h' });
                        res.send({statuscode:1,udata:result,jtoken:token})
                    }
                    else
                    {
                        res.send({statuscode:1,udata:result})
                    }
                }
                else
                {
                    res.send({statuscode:-2})
                }
            }
            else
            {
                res.send({statuscode:0});
            }
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e})
    }   
})

app.get("/api/searchuser",async(req,res)=>
{
    try
    {
        var result = await SignupModel.findOne({username:req.query.un})
        if(result===null)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,udata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchbyuid/:id",async(req,res)=>
{
    try
    {
        var result = await SignupModel.findById(req.params.id)
        if(result)
        {
            res.send({statuscode:1,udata:result})
        }
        else
        {
            res.send({statuscode:0});
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.delete("/api/deleteuser/:uid",async(req,res)=>
{
    try
    {
        var result = await SignupModel.deleteOne({_id:req.params.uid})
        if(result.deletedCount===1)
        {
            res.send({statuscode:1});
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})


app.get("/api/fetchmembers",async(req,res)=>
{
    try
    {
        var result = await SignupModel.find();
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,udata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})



app.put("/api/changepassword",async(req,res)=>
{
    try
    {
        var result = await SignupModel.findOne({username:req.body.uname})
        if(result===null)
        {
            res.send({statuscode:0});
        }
        else
        {
            if(bcrypt.compareSync(req.body.currpass, result.password)===true)
            {
                const encpass = bcrypt.hashSync(req.body.newpass, 10);
                var updateresult = await SignupModel.updateOne({ username: req.body.uname }, { $set: {password:encpass}});
                if(updateresult.modifiedCount===1)
                {
                    res.send({statuscode:1});
                }
                else
                {
                    res.send({statuscode:-3})
                }
            }
            else
            {
                res.send({statuscode:-2});
            }
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }   
})


var CatSchema = new mongoose.Schema({
    catname:String,
    picture:String
},{versionKey: false})

const CatModel = mongoose.model("category",CatSchema,"category")

app.post("/api/savecategory",verifytoken,upload.single('catpic'),async(req,res)=>
{
    if(!req.file)
    {
        picname = "defaultpic.jpg";//give default pic name which we have copied ourselves in uploads folder
    };
    try
    {
        var newrecord = new CatModel({catname:req.body.cname,picture:picname});
        var result = await newrecord.save();
        if(result)
        {
            res.send({statuscode:1})
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchallcat",async(req,res)=>
{
    try
    {
        var result = await CatModel.find();
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,catdata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.delete("/api/deletecat/:cid",async(req,res)=>
{
    try
    {
        var result = await CatModel.deleteOne({_id:req.params.cid})
        if(result.deletedCount===1)
        {
            res.send({statuscode:1});
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.put("/api/updatecategory", upload.single('catpic'),async (req, res)=>
{
    //var d = new Date();
   
    if (!req.file)
    {
        picname=req.body.oldpicname;
    }
    else
    {
      if(req.body.oldpicname!="defaultpic.jpg")
      {
        fs.unlinkSync('public/uploads/' + req.body.oldpicname);
      }
    }
    var updateresult = await CatModel.updateOne({ _id: req.body.cid }, { $set: {catname:req.body.cname,picture:picname}});

    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
  });



var SubCatSchema = new mongoose.Schema({
    catid:String,
    subcatname:String,
    picture:String
},{versionKey: false})

const SubCatModel = mongoose.model("subcategory",SubCatSchema,"subcategory")

app.post("/api/savesubcategory",upload.single('scatpic'),async(req,res)=>
{
    if(!req.file)
    {
        picname = "defaultpic.jpg";//give default pic name which we have copied ourselves in uploads folder
    };
    try
    {
        var newrecord = new SubCatModel({catid:req.body.catid,subcatname:req.body.scname,picture:picname});
        var result = await newrecord.save();
        if(result)
        {
            res.send({statuscode:1})
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchsubcat/:cid",async(req,res)=>
{
    try
    {
        var result = await SubCatModel.find({catid:req.params.cid});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,subcatdata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})


app.get("/api/fetchsubcatdetails",async(req,res)=>
{
    try
    {
        var result = await SubCatModel.findOne({_id:req.query.subcatid});
        if(!result)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,subcatdata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})


app.put("/api/updatesubcategory", upload.single('scatpic'),async (req, res)=>
{
    //var d = new Date();
   
    if (!req.file)
    {
        picname=req.body.oldpicname;
    }
    else
    {
      if(req.body.oldpicname!="defaultpic.jpg")
      {
        fs.unlinkSync('public/uploads/' + req.body.oldpicname);
      }
    }
    var updateresult = await SubCatModel.updateOne({ _id: req.body.subcatid }, { $set: {catid:req.body.catid,subcatname:req.body.scname,picture:picname}});
    
    console.log(updateresult);

    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
});


var ProdSchema = new mongoose.Schema({
    CatID:String,
    SubCatID:String,
    ProdName:String,
    Rate:Number,
    Discount:Number,
    Stock:Number,
    Description:String,
    Featured:String,
    Picture:String,
    AddedOn:String
},{versionKey: false})

const ProductModel = mongoose.model("product",ProdSchema,"product")

app.post("/api/saveproduct",upload.single('prodpic'),async(req,res)=>
{
    if(!req.file)
    {
        picname = "defaultpic.jpg";//give default pic name which we have copied ourselves in uploads folder
    };
    try
    {
        var newrecord = new ProductModel({CatID:req.body.catid,SubCatID:req.body.scid,ProdName:req.body.prodname,Rate:req.body.rate,Discount:req.body.discount,Stock:req.body.stock,Description:req.body.descrip,Featured:req.body.featured,Picture:picname,AddedOn:new Date()});

        var result = await newrecord.save();

        if(result)
        {
            res.send({statuscode:1})
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchproductsbysubcat/:scid",async(req,res)=>
{
    try
    {
        var result = await ProductModel.find({SubCatID:req.params.scid});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,prodsdata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchproductbyprodid",async(req,res)=>
{
    try
    {
        var result = await ProductModel.findById(req.query.prodid);

        if(result)
        {
            res.send({statuscode:1,proddata:result})
        }
        else
        {
            res.send({statuscode:0});
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.put("/api/updateproduct", upload.single('prodpic'),async (req, res)=>
{
    if (!req.file)
    {
        picname=req.body.oldpicname;
    }
    else
    {
      if(req.body.oldpicname!="defaultpic.jpg")
      {
        fs.unlinkSync('public/uploads/' + req.body.oldpicname);
      }
    }
    var updateresult = await ProductModel.updateOne({ _id: req.body.pid }, { $set: {CatID:req.body.catid,SubCatID:req.body.scid,ProdName:req.body.prodname,Rate:req.body.rate,Discount:req.body.discount,Stock:req.body.Stock,Description:req.body.descrip,Featured:req.body.featured,Picture:picname}});
    
    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
});



var CartSchema = new mongoose.Schema({
    picture:String,
    prodid:String,
    pname:String,
    rate:Number,
    qty:Number,
    tcost:Number,
    username:String},{versionKey: false})

const CartModel = mongoose.model("cart",CartSchema,"cart")// internal model name, schema_name, collection_name

app.post("/api/savetocart",async(req,res)=>
{
    try
    {
        var newrecord = new CartModel({picture:req.body.picname,prodid:req.body.prodid,pname:req.body.pname,rate:req.body.rate,qty:req.body.qty,tcost:req.body.tcost,username:req.body.uname});

        var result = await newrecord.save();
        if(result)
        {
            res.send({statuscode:1})
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code,err:e})
    }
    
})


app.get("/api/fetchcart/:uname",async(req,res)=>
{
    try
    {
        var result = await CartModel.find({username:req.params.uname});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,cdata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})


var CheckoutSchema = new mongoose.Schema({
    address:String,
    city:String,
    state:String,
    phone:String,
    billamount:Number,
    username:String,
    orderdt:String,
    items:[Object],
    status:String},{versionKey: false})

const CheckoutModel = mongoose.model("order",CheckoutSchema,"order")// internal model name, schema_name, collection_name

app.post("/api/saveorder",async(req,res)=>
{
    try
    {
        var newrecord = new CheckoutModel({address:req.body.saddr,city:req.body.city,state:req.body.state,phone:req.body.phone,billamount:req.body.billamount,username:req.body.uname,orderdt:new Date(),items:req.body.cartdata,status:"Order Received, Processing"});

        var result = await newrecord.save();
        if(result)
        {
            let updateresp=false;
            var updatelist=req.body.cartdata;//updatelist becomes an array becoz we are saving an json array into it
            for(let x=0;x<updatelist.length;x++)
            {
                var updateresult = await ProductModel.updateOne({_id:updatelist[x].prodid},{$inc: {"Stock":-updatelist[x].qty}});

                if(updateresult.modifiedCount===1)
                {
                    updateresp=true;
                }
                else
                {
                    updateresp=false;
                }
            }

            if(updateresp==true)
            {
                var delres = CartModel.deleteMany({username:req.body.uname})
                if((await delres).deletedCount>=1)
                {
                    res.json({statuscode:1});
                }
                else
                {
                    res.json({statuscode:0});
                }
            }
            else
            {
                res.json({statuscode:0});
            }
        }
        else
        {
            res.send({statuscode:0})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code,err:e})
    }
    
})

app.get("/api/fetchorderdetails/:uname",async (req,res)=>
{
    var result = await CheckoutModel.findOne({username:req.params.uname}).sort({"orderdt":-1});
    console.log(result)
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,orderdata:result})
    }   
})

app.get("/api/fetchorders",async(req,res)=>
{
    try
    {
        var result = await CheckoutModel.find().sort({"orderdt":-1});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,odata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/fetchitems/:oid",async(req,res)=>
{
    try
    {
        var result = await CheckoutModel.findOne({_id:req.params.oid});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,idata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.put("/api/updatestatus",async (req, res)=>
{
    
    var updateresult = await CheckoutModel.updateOne({ _id: req.body.orderid }, { $set: {status:req.body.newst}});

    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
});

app.get("/api/fetchuserorders/:uname",async(req,res)=>
{
    try
    {
        var result = await CheckoutModel.find({username:req.params.uname}).sort({"orderdt":-1});
        if(result.length===0)
        {
            res.send({statuscode:0});
        }
        else
        {
            res.send({statuscode:1,odata:result})
        }
    }
    catch(e)
    {
        res.send({statuscode:-1,errcode:e.code})
    }
    
})

app.get("/api/searchprodsbyname/:term", async(req, res)=>
{
  var searchtext=req.params.term;
  var result = await ProductModel.find({ProdName: { $regex: '.*' + searchtext ,$options:'i' }});
    if (result.length===0)
    {
        res.json({statuscode:0})
    }
    else
    {     
        res.send({statuscode:1,prodsdata:result});
    }
});

app.get("/api/fetchlatestprods", async(req, res)=>
{
  var result = await ProductModel.find().sort({"AddedOn":-1}).limit(6);
    if (result.length===0)
    {
        res.json({statuscode:0})
    }
    else
    {     
        res.send({statuscode:1,prodsdata:result});
    }
});

app.post("/api/contactus",async (req, res)=> 
  {
      const mailOptions = 
      {
      from: 'groceryplanet@hotmail.com',
      to: 'gtbtrial@gmail.com',
      subject: 'Message from Website - Contact Us',
      text: `Name:- ${req.body.pname}\nPhone:-${req.body.phone}\nEmail:-${req.body.email}\nMessage:-${req.body.msg}`
    };
  
    // Use the transport object to send the email
    transporter.sendMail(mailOptions, (error, info) => 
    {
      if (error) {
        console.log(error);
        res.send({msg:'Error sending email'});
      } 
      else 
      {
        console.log('Email sent: ' + info.response);
        res.send({msg:"Message sent successfully"});
      }
    });
  
  });

  app.put("/api/activateaccount", async (req, res)=>
  {
      var updateresult = await SignupModel.updateOne({acttoken: req.body.token }, { $set: {actstatus:true}});
  
      if(updateresult.modifiedCount===1)
      {
          res.send({statuscode:1});
      }
      else
      {
          res.send({statuscode:0})
      }
    });

    var resetPasswordSchema = new mongoose.Schema({username:String,token:String,exptime:String}, { versionKey: false } );

    var resetpassModel = mongoose.model("resetpass",resetPasswordSchema,"resetpass");
    
    app.get('/api/forgotpassword', async (req, res) => 
    {
      const userdata = await SignupModel.findOne({ username: req.query.username });
      if (!userdata) 
      {
        return res.send({msg:'Invalid Username'});
      }
      else
      {
        var resettoken = uuid.v4();
        var minutesToAdd=15;
        var currentDate = new Date();
        var futureDate = new Date(currentDate.getTime() + minutesToAdd*60000);
    
        var newreset = new resetpassModel({username:req.query.username,token:resettoken,exptime:futureDate});
        let saveresult = await newreset.save();
    
        if(saveresult)
        {
          const resetLink = `http://localhost:3000/resetpassword?token=${resettoken}`;
          const mailOptions = {
          from: 'groceryplanet@hotmail.com',
          to: req.query.username,
          subject: 'Reset your password::ShoppingPlaza.com',
          text: `Hi ${userdata.name},\n\n Please click on the following link to reset your password: \n\n ${resetLink}`
          };
          // Use the transport object to send the email
          transporter.sendMail(mailOptions, (error, info) => 
          {
            if (error) {
              console.log(error);
              res.status(500).send({msg:'Error sending email'});
            } else {
              console.log('Email sent: ' + info.response);
              res.status(200).send({msg:"Please check your mail to reset your password"});
            }
          });
        }
        else
        {
          res.send({msg:"Error, try again"});
        }
      }
      // user.isActive = true;
      // await user.save();
      // return res.status(200).send({msg:'Account activated successfully'});
    });



app.get('/api/checktoken', async (req, res) => 
{
  const resetdata = await resetpassModel.findOne({ token: req.query.token });
  if (!resetdata) 
  {
    return res.send({statuscode:-1,msg:'Invalid reset link. Try Again'});
  }
  else
  {
    console.log(resetdata);
    var exptime = new Date(resetdata.exptime);//Mon Feb 05 2024 16:08:26 GMT+0530
    var currenttime = new Date();//Mon Feb 05 2024 16:09:26 GMT+0530

    if(currenttime<exptime)
    {
      res.send({statuscode:1,username:resetdata.username})
    }
    else
    {
      return res.send({statuscode:0,msg:'Link Expired. It was valid for 15 mins only. Request new link'});
    }
  }
});


const ProdImagesSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    imageNames: [String]
  },{versionKey: false});
  
  const ProdImagesModel = mongoose.model('prodpics', ProdImagesSchema,"prodpics");

  app.post('/api/prodimages', upload.array('images'), async (req, res) => 
  {
    const { productId } = req.body;
    try 
    {
        const imageNames = req.files.map(file => file.filename);
        
        const product = await ProdImagesModel.create({
        productId,
        imageNames
      });
      res.json({statuscode:1});
    } 
    catch (e) 
    {
      console.error('Error saving product images:', e);
      res.status(500).json({statuscode:0, error: 'Server error' });
    }
  });

  app.get('/api/fetchproductimages/:productId', async (req, res) => {
    try 
    {
      const pimages = await ProdImagesModel.findOne({productId:req.params.productId});
      if (!pimages) 
      {
        return res.status(404).json({statuscode:0, error: 'Images not found' });
      }
      else
      {
        return res.json({statuscode:1,pics:pimages.imageNames});
      }
    } 
    catch (e) 
    {
      console.error('Error fetching images:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.listen(9000,()=>
{
    console.log("Node Server is running")
})
